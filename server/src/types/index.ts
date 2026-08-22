/**
 * Server Type Definitions
 * Self-contained for standalone server deployment
 */

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface HealthStatus {
  status: 'ok' | 'degraded' | 'error';
  uptime: number; // in seconds
  environment: string;
  version: string;
  memory: {
    heapUsed: string;
    heapTotal: string;
    rss: string;
  };
  timestamp: string;
}

export interface AppInfo {
  name: string;
  version: string;
  description: string;
  endpoints: {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    path: string;
    description: string;
  }[];
}

export type ItemCategory = 'feature' | 'bug' | 'task' | 'documentation';
export type ItemPriority = 'low' | 'medium' | 'high' | 'urgent';
export type ItemStatus = 'pending' | 'in_progress' | 'completed';

export interface Item {
  id: string;
  title: string;
  description: string;
  category: ItemCategory;
  priority: ItemPriority;
  status: ItemStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateItemDto {
  title: string;
  description: string;
  category: ItemCategory;
  priority: ItemPriority;
  status?: ItemStatus;
}

export interface UpdateItemDto {
  title?: string;
  description?: string;
  category?: ItemCategory;
  priority?: ItemPriority;
  status?: ItemStatus;
}

// RAG Specific Types
export type DocumentStatus = 'processing' | 'indexed' | 'error';
export type DocumentType = 'pdf' | 'txt';

export interface Document {
  id: string;
  name: string;
  size: number;
  type: DocumentType;
  chunkCount: number;
  status: DocumentStatus;
  error?: string;
  createdAt: string;
}

export interface Citation {
  docId: string;
  docName: string;
  chunkIndex: number;
  text: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  citations?: Citation[];
  rating?: 'like' | 'dislike';
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
}

export interface FeedbackDto {
  messageId: string;
  rating: 'like' | 'dislike';
}

export interface CustomError extends Error {
  statusCode?: number;
  details?: any;
}
