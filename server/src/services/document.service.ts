import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';
import { Document, DocumentStatus } from '../types';
import { vectorDb } from './vector';
import { ragService } from './rag.service';

const DATA_DIR = process.env.VERCEL
  ? path.join('/tmp', 'data')
  : path.resolve(__dirname, '../../../data');
const FILE_PATH = path.join(DATA_DIR, 'documents.json');

class DocumentService {
  private documents: Document[] = [];

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
        this.documents = JSON.parse(content);
      } else {
        this.documents = [];
        this.saveToFile();
      }
    } catch (err) {
      console.error('[DocumentService] Error reading documents database:', err);
      this.documents = [];
    }
  }

  private saveToFile() {
    try {
      this.ensureDataDirectory();
      fs.writeFileSync(FILE_PATH, JSON.stringify(this.documents, null, 2), 'utf-8');
    } catch (err) {
      console.error('[DocumentService] Error saving documents database:', err);
    }
  }

  // Get list of all documents
  async getAll(): Promise<Document[]> {
    return this.documents;
  }

  // Add document record
  private addOrUpdateDoc(doc: Document) {
    const idx = this.documents.findIndex((d) => d.id === doc.id);
    if (idx !== -1) {
      this.documents[idx] = doc;
    } else {
      this.documents.push(doc);
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
      
      // Try to align to sentence boundary (period, question mark, or exclamation mark)
      if (end < cleanText.length) {
        const lastSentenceBoundary = Math.max(
          cleanText.lastIndexOf('. ', end),
          cleanText.lastIndexOf('? ', end),
          cleanText.lastIndexOf('! ', end)
        );
        
        // If boundary is close to the end of chunk (within 150 chars), align to it
        if (lastSentenceBoundary > start + chunkSize - 150) {
          end = lastSentenceBoundary + 1;
        }
      }

      chunks.push(cleanText.slice(start, end).trim());
      start = end - overlap;
      
      // Safety guard against infinite loops
      if (overlap >= chunkSize) {
        start = end;
      }
    }

    return chunks.filter(c => c.length > 20); // Filter out trivial noise
  }

  // Ingest file: reads, chunks, embeds, and indexes into the vector db
  async ingestFile(file: { originalname: string; buffer: Buffer; size: number }): Promise<Document> {
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

    // Add immediate status to document list
    this.addOrUpdateDoc(newDoc);

    // Process asynchronously so file upload completes immediately
    this.processIngestion(newDoc, file.buffer).catch((err) => {
      console.error(`[Ingestion] Failed to process document ${newDoc.name}:`, err);
      newDoc.status = 'error';
      newDoc.error = err.message || 'Unknown processing error';
      this.addOrUpdateDoc(newDoc);
    });

    return newDoc;
  }

  private async processIngestion(doc: Document, buffer: Buffer): Promise<void> {
    let rawText = '';

    if (doc.type === 'pdf') {
      const parseFn: any = typeof pdfParse === 'function' ? pdfParse : (pdfParse as any).default || (pdfParse as any);
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
    console.log(`[Ingestion] Document "${doc.name}" split into ${textChunks.length} chunks.`);

    // Generate embeddings & vector DB records
    const vectorChunks = [];
    for (let i = 0; i < textChunks.length; i++) {
      const chunkText = textChunks[i];
      // Generate embedding vector using free service
      const vector = await ragService.generateEmbedding(chunkText);
      
      vectorChunks.push({
        id: `${doc.id}_${i}`,
        docId: doc.id,
        docName: doc.name,
        chunkIndex: i,
        text: chunkText,
        vector,
      });
    }

    // Insert vectors into DB
    await vectorDb.upsert(vectorChunks);

    // Update document metadata record
    doc.status = 'indexed';
    doc.chunkCount = textChunks.length;
    this.addOrUpdateDoc(doc);
    console.log(`[Ingestion] Document "${doc.name}" successfully indexed into the Vector Database.`);
  }

  // Delete document and remove all associated vectors from Vector DB
  async delete(id: string): Promise<boolean> {
    const initialCount = this.documents.length;
    this.documents = this.documents.filter((doc) => doc.id !== id);

    if (this.documents.length < initialCount) {
      this.saveToFile();
      // Remove vectors from VectorDB
      await vectorDb.deleteByDocId(id);
      return true;
    }

    return false;
  }

  // Reset database (clears docs and vectors)
  async reset(): Promise<void> {
    this.documents = [];
    this.saveToFile();
    await vectorDb.reset();
  }
}

export const documentService = new DocumentService();
