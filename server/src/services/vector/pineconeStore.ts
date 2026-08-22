import { Pinecone, RecordMetadata } from '@pinecone-database/pinecone';
import { VectorStore, VectorChunk, QueryResult } from './base';
import { config } from '../../config';

export interface ChunkMetadata extends RecordMetadata {
  docId: string;
  docName: string;
  chunkIndex: number;
  text: string;
}

export class PineconeVectorStore implements VectorStore {
  private client: Pinecone | null = null;
  private indexName: string;
  private namespace?: string;

  constructor() {
    this.indexName = config.pineconeIndex || 'rag-index';
    this.namespace = config.pineconeNamespace;
    this.initClient();
  }

  private initClient(): void {
    if (config.pineconeApiKey) {
      try {
        this.client = new Pinecone({
          apiKey: config.pineconeApiKey,
        });
        console.log(`[PineconeVectorStore] Initialized Pinecone client for index "${this.indexName}".`);
      } catch (err) {
        console.error('[PineconeVectorStore] Failed to initialize Pinecone client:', err);
      }
    }
  }

  private getIndex() {
    if (!this.client) {
      this.initClient();
    }
    if (!this.client) {
      throw new Error(
        'Pinecone is not configured. Please set PINECONE_API_KEY and PINECONE_INDEX in your .env file.'
      );
    }
    const index = this.client.index<ChunkMetadata>(this.indexName);
    return this.namespace ? index.namespace(this.namespace) : index;
  }

  async upsert(chunks: VectorChunk[]): Promise<void> {
    if (chunks.length === 0) return;

    const index = this.getIndex();

    // Pinecone recommends batches of <= 100 records
    const BATCH_SIZE = 100;
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);
      const records = batch.map((chunk) => ({
        id: chunk.id,
        values: chunk.vector,
        metadata: {
          docId: chunk.docId,
          docName: chunk.docName,
          chunkIndex: chunk.chunkIndex,
          text: chunk.text,
        },
      }));

      await index.upsert({ records });
    }

    console.log(`[PineconeVectorStore] Upserted ${chunks.length} chunks to index "${this.indexName}".`);
  }

  async query(queryVector: number[], limit: number = 4): Promise<QueryResult[]> {
    const index = this.getIndex();

    const response = await index.query({
      vector: queryVector,
      topK: limit,
      includeMetadata: true,
    });

    const matches = response.matches || [];

    return matches.map((match) => {
      const metadata = (match.metadata || {}) as ChunkMetadata;
      return {
        chunk: {
          id: match.id,
          docId: metadata.docId || '',
          docName: metadata.docName || '',
          chunkIndex: typeof metadata.chunkIndex === 'number' ? metadata.chunkIndex : 0,
          text: metadata.text || '',
        },
        score: match.score ?? 0,
      };
    });
  }

  async deleteByDocId(docId: string): Promise<void> {
    const index = this.getIndex();
    try {
      await index.deleteMany({
        filter: {
          docId: { $eq: docId },
        },
      });
      console.log(`[PineconeVectorStore] Deleted vectors for docId "${docId}".`);
    } catch (err: any) {
      console.warn(`[PineconeVectorStore] deleteMany error (${err.message}).`);
      throw err;
    }
  }

  async reset(): Promise<void> {
    const index = this.getIndex();
    await index.deleteAll();
    console.log(`[PineconeVectorStore] Reset all vectors in index "${this.indexName}".`);
  }
}

export const pineconeVectorStore = new PineconeVectorStore();