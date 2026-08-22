import { VectorStore } from './base';
import { localVectorStore } from './localStore';

// Expose VectorStore implementation
// We default to LocalVectorStore to guarantee 100% offline, free operational correctness.
// If needed in the future, PineconeStore can be conditionally instantiated here.
export const vectorDb: VectorStore = localVectorStore;

export * from './base';
