import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';
import { Document, DocumentStatus } from '../types';
import { DocumentModel } from '../models';
import { vectorDb } from './vector';
import { ragService } from './rag.service';

const DATA_DIR = process.env.VERCEL
  ? path.join('/tmp', 'data')
  : path.resolve(__dirname, '../../../data');
const FILE_PATH = path.join(DATA_DIR, 'documents.json');

class DocumentService {
  private fallbackDocs: (Document & { userId?: string })[] = [];

  constructor() {
    this.ensureDataDirectory();
    this.loadFromFile();
  }

  private ensureDataDirectory() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private loadFromFile() {
    try {
      if (fs.existsSync(FILE_PATH)) {
        const content = fs.readFileSync(FILE_PATH, 'utf-8');
        this.fallbackDocs = JSON.parse(content);
      } else {
        this.fallbackDocs = [];
      }
    } catch {
      this.fallbackDocs = [];
    }
  }

  private saveToFile() {
    try {
      this.ensureDataDirectory();
      fs.writeFileSync(FILE_PATH, JSON.stringify(this.fallbackDocs, null, 2), 'utf-8');
    } catch (err) {
      console.error('[DocumentService] Error saving fallback documents:', err);
    }
  }

  // Get list of documents strictly isolated by userId
  async getAll(userId: string): Promise<Document[]> {
    try {
      const docs = await DocumentModel.find({ userId }).sort({ createdAt: -1 }).lean();
      if (docs && docs.length > 0) {
        return docs.map((d: any) => ({
          id: d._id,
          name: d.name,
          size: d.size,
          type: d.type,
          chunkCount: d.chunkCount || 0,
          status: d.status,
          error: d.error,
          createdAt: d.createdAt ? new Date(d.createdAt).toISOString() : new Date().toISOString(),
        }));
      }
    } catch (err: any) {
      console.warn('[DocumentService] MongoDB query failed, falling back to memory storage:', err.message);
    }

    return this.fallbackDocs.filter((d) => d.userId === userId);
  }

  // Add or update document record in DB strictly scoped to userId
  private async addOrUpdateDoc(doc: Document, userId: string) {
    try {
      await DocumentModel.findByIdAndUpdate(
        doc.id,
        {
          _id: doc.id,
          userId,
          name: doc.name,
          size: doc.size,
          type: doc.type,
          chunkCount: doc.chunkCount,
          status: doc.status,
          error: doc.error,
        },
        { upsert: true, new: true }
      );
    } catch (err: any) {
      console.warn('[DocumentService] MongoDB upsert failed, saving to local fallback:', err.message);
    }

    const idx = this.fallbackDocs.findIndex((d) => d.id === doc.id);
    const docWithUser = { ...doc, userId };
    if (idx !== -1) {
      this.fallbackDocs[idx] = docWithUser;
    } else {
      this.fallbackDocs.push(docWithUser);
    }
    this.saveToFile();
  }

  // Chunker logic: Split text into sliding semantic chunks of chunkSize characters and overlap characters
  private chunkText(text: string, chunkSize: number = 800, overlap: number = 150): string[] {
    const cleanText = text.replace(/\s+/g, ' ').trim();
    if (cleanText.length <= chunkSize) {
      return [cleanText];
    }

    const chunks: string[] = [];
    let start = 0;

    while (start < cleanText.length) {
      let end = start + chunkSize;

      // Try to align to sentence boundary
      if (end < cleanText.length) {
        const lastSentenceBoundary = Math.max(
          cleanText.lastIndexOf('. ', end),
          cleanText.lastIndexOf('? ', end),
          cleanText.lastIndexOf('! ', end)
        );

        if (lastSentenceBoundary > start + chunkSize - 150) {
          end = lastSentenceBoundary + 1;
        }
      }

      chunks.push(cleanText.slice(start, end).trim());
      start = end - overlap;

      if (overlap >= chunkSize) {
        start = end;
      }
    }

    return chunks.filter((c) => c.length > 20);
  }

  // Ingest file: reads, chunks, embeds, and indexes into the vector db strictly with userId
  async ingestFile(
    file: { originalname: string; buffer: Buffer; size: number },
    userId: string
  ): Promise<Document> {
    const docId = Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
    const docType = file.originalname.endsWith('.pdf') ? 'pdf' : 'txt';

    const newDoc: Document = {
      id: docId,
      name: file.originalname,
      size: file.size,
      type: docType,
      chunkCount: 0,
      status: 'processing',
      createdAt: new Date().toISOString(),
    };

    // Add initial record
    await this.addOrUpdateDoc(newDoc, userId);

    try {
      await this.processIngestion(newDoc, file.buffer, userId);
    } catch (err: any) {
      console.error(`[Ingestion] Failed to process document ${newDoc.name}:`, err);
      newDoc.status = 'error';
      newDoc.error = err.message || 'Unknown processing error';
      await this.addOrUpdateDoc(newDoc, userId);
      throw err;
    }

    return newDoc;
  }

  private async processIngestion(doc: Document, buffer: Buffer, userId: string): Promise<void> {
    let rawText = '';

    if (doc.type === 'pdf') {
      const parseFn: any =
        typeof pdfParse === 'function' ? pdfParse : (pdfParse as any).default || (pdfParse as any);
      if (typeof parseFn === 'function') {
        const parsedPdf = await parseFn(buffer);
        rawText = parsedPdf.text;
      } else if ((pdfParse as any).PDFParse) {
        const parser = new (pdfParse as any).PDFParse({ data: buffer });
        await parser.load();
        rawText = await parser.getText();
      } else {
        throw new Error('PDF parser engine could not be initialized.');
      }
    } else {
      rawText = buffer.toString('utf-8');
    }

    if (!rawText || rawText.trim().length === 0) {
      throw new Error('Document is empty or text could not be extracted.');
    }

    // Split text into semantic chunks
    const textChunks = this.chunkText(rawText);
    console.log(`[Ingestion] Document "${doc.name}" for user "${userId}" split into ${textChunks.length} chunks.`);

    // Generate embeddings in parallel batches (15 chunks at a time)
    const BATCH_SIZE = 15;
    const vectorChunks = [];

    for (let i = 0; i < textChunks.length; i += BATCH_SIZE) {
      const batchSlice = textChunks.slice(i, i + BATCH_SIZE);
      const batchVectors = await Promise.all(
        batchSlice.map((chunk) => ragService.generateEmbedding(chunk))
      );

      for (let j = 0; j < batchSlice.length; j++) {
        const chunkIndex = i + j;
        vectorChunks.push({
          id: `${doc.id}_${chunkIndex}`,
          docId: doc.id,
          docName: doc.name,
          chunkIndex,
          text: batchSlice[j],
          vector: batchVectors[j],
          userId,
        });
      }
    }

    // Insert vectors into DB with strict userId metadata
    await vectorDb.upsert(vectorChunks);

    // Update document metadata record
    doc.status = 'indexed';
    doc.chunkCount = textChunks.length;
    await this.addOrUpdateDoc(doc, userId);
    console.log(`[Ingestion] Document "${doc.name}" for user "${userId}" successfully indexed (${textChunks.length} chunks).`);
  }

  // Delete document strictly for matching userId
  async delete(id: string, userId: string): Promise<boolean> {
    let deletedFromDb = false;
    try {
      const res = await DocumentModel.deleteOne({ _id: id, userId });
      deletedFromDb = res.deletedCount > 0;
    } catch (err: any) {
      console.warn('[DocumentService] MongoDB delete error:', err.message);
    }

    const initialCount = this.fallbackDocs.length;
    this.fallbackDocs = this.fallbackDocs.filter((doc) => !(doc.id === id && doc.userId === userId));
    if (this.fallbackDocs.length < initialCount) {
      this.saveToFile();
    }

    // Remove vectors strictly for this document and user
    await vectorDb.deleteByDocId(id, userId);
    return deletedFromDb || this.fallbackDocs.length < initialCount;
  }

  // Reset database strictly for this user
  async reset(userId: string): Promise<void> {
    try {
      await DocumentModel.deleteMany({ userId });
    } catch (err: any) {
      console.warn('[DocumentService] MongoDB reset error:', err.message);
    }

    this.fallbackDocs = this.fallbackDocs.filter((doc) => doc.userId !== userId);
    this.saveToFile();
    await vectorDb.reset(userId);
  }
}

export const documentService = new DocumentService();
