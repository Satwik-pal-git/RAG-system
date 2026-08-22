export interface VectorChunk {
  id: string; // Unique chunk ID (e.g. docId_chunkIndex)
  docId: string;
  docName: string;
  chunkIndex: number;
  text: string;
  vector: number[]; // Embedded float array
}

export interface QueryResult {
  chunk: Omit<VectorChunk, 'vector'>;
  score: number; // Cosine similarity score
}

export interface VectorStore {
  upsert(chunks: VectorChunk[]): Promise<void>;
  query(vector: number[], limit?: number): Promise<QueryResult[]>;
  deleteByDocId(docId: string): Promise<void>;
  reset(): Promise<void>;
}
