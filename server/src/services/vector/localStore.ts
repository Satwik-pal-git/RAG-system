import fs from 'fs';
import path from 'path';
import { VectorStore, VectorChunk, QueryResult, VectorQueryFilter } from './base';

const DATA_DIR = process.env.VERCEL
  ? path.join('/tmp', 'data')
  : path.resolve(__dirname, '../../../data');
const FILE_PATH = path.join(DATA_DIR, 'vectors.json');

export class LocalVectorStore implements VectorStore {
  private chunks: VectorChunk[] = [];

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
        const fileContent = fs.readFileSync(FILE_PATH, 'utf-8');
        this.chunks = JSON.parse(fileContent);
        console.log(`[LocalVectorStore] Loaded ${this.chunks.length} chunks from storage.`);
      } else {
        this.chunks = [];
        this.saveToFile();
      }
    } catch (err) {
      console.error('[LocalVectorStore] Error loading vector database file:', err);
      this.chunks = [];
    }
  }

  private saveToFile() {
    try {
      this.ensureDataDirectory();
      fs.writeFileSync(FILE_PATH, JSON.stringify(this.chunks, null, 2), 'utf-8');
    } catch (err) {
      console.error('[LocalVectorStore] Error saving vectors to disk:', err);
    }
  }

  // Normalize a vector to unit length so Cosine Similarity reduces to Dot Product
  private normalize(v: number[]): number[] {
    let normSq = 0;
    for (let i = 0; i < v.length; i++) {
      normSq += v[i] * v[i];
    }
    if (normSq === 0 || normSq === 1) return v;
    const invMag = 1 / Math.sqrt(normSq);
    return v.map((val) => val * invMag);
  }

  // Fast dot-product on unit vectors
  private fastDotProduct(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    let dot = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
    }
    return dot;
  }

  async upsert(newChunks: VectorChunk[]): Promise<void> {
    // Pre-normalize incoming vectors for optimal query performance
    const normalizedChunks = newChunks.map((c) => ({
      ...c,
      vector: this.normalize(c.vector),
    }));

    // Prevent duplicate chunk IDs
    const newIds = new Set(normalizedChunks.map((c) => c.id));
    this.chunks = this.chunks.filter((c) => !newIds.has(c.id));

    // Add new chunks
    this.chunks.push(...normalizedChunks);
    this.saveToFile();
  }

  async query(
    queryVector: number[],
    limit: number = 4,
    filter?: VectorQueryFilter
  ): Promise<QueryResult[]> {
    // Filter chunks by userId and docId if provided
    let candidateChunks = this.chunks;

    if (filter) {
      if (filter.userId) {
        // Strict user isolation: only chunks belonging to this user
        candidateChunks = candidateChunks.filter((c) => c.userId === filter.userId);
      }
      if (filter.docId) {
        candidateChunks = candidateChunks.filter((c) => c.docId === filter.docId);
      }
    }

    if (candidateChunks.length === 0) {
      return [];
    }

    // Normalize query vector once
    const normQuery = this.normalize(queryVector);

    const results: QueryResult[] = candidateChunks.map((chunk) => {
      const score = this.fastDotProduct(normQuery, chunk.vector);
      const { vector, ...chunkData } = chunk;
      return {
        chunk: chunkData,
        score,
      };
    });

    // Sort by descending similarity score
    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  async deleteByDocId(docId: string, userId?: string): Promise<void> {
    const initialCount = this.chunks.length;
    this.chunks = this.chunks.filter((c) => {
      if (c.docId !== docId) return true;
      if (userId && c.userId !== userId) return true;
      return false;
    });

    if (this.chunks.length < initialCount) {
      this.saveToFile();
      console.log(`[LocalVectorStore] Deleted chunks for document: ${docId} (user: ${userId || 'all'})`);
    }
  }

  async reset(userId?: string): Promise<void> {
    if (userId) {
      this.chunks = this.chunks.filter((c) => c.userId !== userId);
    } else {
      this.chunks = [];
    }
    this.saveToFile();
    console.log(`[LocalVectorStore] Database reset completed${userId ? ` for user ${userId}` : ''}.`);
  }

}

export const localVectorStore = new LocalVectorStore();
