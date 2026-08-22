import { VectorStore } from './base';
import { localVectorStore } from './localStore';
import { pineconeVectorStore } from './pineconeStore';
import { config } from '../../config';

// Expose active VectorStore implementation
// If PINECONE_API_KEY is configured, uses PineconeVectorStore; otherwise falls back gracefully to LocalVectorStore.
const isPineconeConfigured = Boolean(config.pineconeApiKey && config.pineconeApiKey.trim().length > 0);

if (isPineconeConfigured) {
  console.log(`[VectorDB] Using Pinecone Vector Store (Index: "${config.pineconeIndex || 'rag-index'}").`);
} else {
  console.log('[VectorDB] PINECONE_API_KEY not provided. Using Local Vector Store (JSON).');
}

export const vectorDb: VectorStore = isPineconeConfigured ? pineconeVectorStore : localVectorStore;

export * from './base';
export * from './localStore';
export * from './pineconeStore';
