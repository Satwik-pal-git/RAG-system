export interface VectorChunk {
  id: string; // Unique chunk ID (e.g. docId_chunkIndex)
  docId: string;
  docName: string;
  chunkIndex: number;
  text: string;
  vector: number[]; // Embedded float array
  userId?: string;  // User scoping
}

export interface QueryResult {
  chunk: Omit<VectorChunk, 'vector'>;
  score: number; // Cosine similarity score
}

export interface VectorQueryFilter {
  userId?: string;
  docId?: string;
}

export interface VectorStore {
  upsert(chunks: VectorChunk[]): Promise<void>;
  query(vector: number[], limit?: number, filter?: VectorQueryFilter): Promise<QueryResult[]>;
  deleteByDocId(docId: string, userId?: string): Promise<void>;
  reset(userId?: string): Promise<void>;
}
