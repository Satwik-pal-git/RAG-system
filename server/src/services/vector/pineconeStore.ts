import { Pinecone, RecordMetadata } from '@pinecone-database/pinecone';
import { VectorStore, VectorChunk, QueryResult, VectorQueryFilter } from './base';
import { config } from '../../config';

export interface ChunkMetadata extends RecordMetadata {
  docId: string;
  docName: string;
  chunkIndex: number;
  text: string;
  userId: string;
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
          userId: chunk.userId || 'anonymous',
        },
      }));

      await index.upsert({ records });
    }

    console.log(`[PineconeVectorStore] Upserted ${chunks.length} chunks to index "${this.indexName}".`);
  }

  async query(
    queryVector: number[],
    limit: number = 4,
    filter?: VectorQueryFilter
  ): Promise<QueryResult[]> {
    const index = this.getIndex();

    // Build Pinecone metadata filter
    let pineconeFilter: Record<string, any> | undefined = undefined;
    if (filter) {
      const filterConditions: Record<string, any>[] = [];
      if (filter.docId) {
        filterConditions.push({ docId: { $eq: filter.docId } });
      }
      if (filter.userId) {
        // Strict user isolation
        filterConditions.push({ userId: { $eq: filter.userId } });
      }
      if (filterConditions.length === 1) {
        pineconeFilter = filterConditions[0];
      } else if (filterConditions.length > 1) {
        pineconeFilter = { $and: filterConditions };
      }
    }

    const response = await index.query({
      vector: queryVector,
      topK: limit,
      includeMetadata: true,
      filter: pineconeFilter,
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
          userId: metadata.userId,
        },
        score: match.score ?? 0,
      };
    });
  }

  async deleteByDocId(docId: string, userId?: string): Promise<void> {
    const index = this.getIndex();
    try {
      const filterObj: Record<string, any> = {
        docId: { $eq: docId },
      };
      if (userId) {
        filterObj.userId = { $eq: userId };
      }
      await index.deleteMany({
        filter: filterObj,
      });
      console.log(`[PineconeVectorStore] Deleted vectors for docId "${docId}" (userId: ${userId || 'all'}).`);
    } catch (err: any) {
      console.warn(`[PineconeVectorStore] deleteMany error (${err.message}).`);
      throw err;
    }
  }

  async reset(userId?: string): Promise<void> {
    const index = this.getIndex();
    if (userId) {
      try {
        await index.deleteMany({
          filter: { userId: { $eq: userId } },
        });
        console.log(`[PineconeVectorStore] Reset vectors for userId "${userId}".`);
      } catch (err: any) {
        console.warn(`[PineconeVectorStore] reset error for user ${userId}: (${err.message})`);
      }
    } else {
      await index.deleteAll();
      console.log(`[PineconeVectorStore] Reset all vectors in index "${this.indexName}".`);
    }
  }

}

export const pineconeVectorStore = new PineconeVectorStore();