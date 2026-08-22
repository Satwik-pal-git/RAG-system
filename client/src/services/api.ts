import {
  ApiResponse,
  HealthStatus,
  AppInfo,
  Item,
  CreateItemDto,
  UpdateItemDto,
  Document,
  ChatMessage,
} from '../types';

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api`
  : '/api';

class ApiClient {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

    // Set headers unless we are uploading multipart Form Data (which sets boundary automatically)
    const isFormData = options.body instanceof FormData;
    const headers: HeadersInit = {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data: ApiResponse<T> = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || `HTTP Error: ${response.status} ${response.statusText}`);
      }

      return data;
    } catch (error: any) {
      console.error(`API Error on [${options.method || 'GET'} ${url}]:`, error);
      throw error;
    }
  }

  // Health and Metadata
  async getHealth(): Promise<ApiResponse<HealthStatus>> {
    return this.request<HealthStatus>('/health');
  }

  async getAppInfo(): Promise<ApiResponse<AppInfo>> {
    return this.request<AppInfo>('/info');
  }

  // Item CRUD
  async getItems(params?: { search?: string; category?: string; status?: string }): Promise<ApiResponse<Item[]>> {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set('search', params.search);
    if (params?.category) searchParams.set('category', params.category);
    if (params?.status) searchParams.set('status', params.status);

    const qs = searchParams.toString();
    const endpoint = `/items${qs ? `?${qs}` : ''}`;
    return this.request<Item[]>(endpoint);
  }

  async getItemById(id: string): Promise<ApiResponse<Item>> {
    return this.request<Item>(`/items/${id}`);
  }

  async createItem(dto: CreateItemDto): Promise<ApiResponse<Item>> {
    return this.request<Item>('/items', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  async updateItem(id: string, dto: UpdateItemDto): Promise<ApiResponse<Item>> {
    return this.request<Item>(`/items/${id}`, {
      method: 'PUT',
      body: JSON.stringify(dto),
    });
  }

  async deleteItem(id: string): Promise<ApiResponse<null>> {
    return this.request<null>(`/items/${id}`, {
      method: 'DELETE',
    });
  }

  async resetItems(): Promise<ApiResponse<Item[]>> {
    return this.request<Item[]>('/items/reset', {
      method: 'POST',
    });
  }

  // RAG Document Ingestion API
  async getDocuments(): Promise<ApiResponse<Document[]>> {
    return this.request<Document[]>('/documents');
  }

  async uploadDocument(file: File): Promise<ApiResponse<Document>> {
    const formData = new FormData();
    formData.append('file', file);
    return this.request<Document>('/documents/upload', {
      method: 'POST',
      body: formData,
    });
  }

  async deleteDocument(id: string): Promise<ApiResponse<null>> {
    return this.request<null>(`/documents/${id}`, {
      method: 'DELETE',
    });
  }

  async resetDocuments(): Promise<ApiResponse<null>> {
    return this.request<null>('/documents/reset', {
      method: 'POST',
    });
  }

  // RAG Chat API
  async chat(message: string, history: ChatMessage[]): Promise<ApiResponse<{ response: string; citations: any[] }>> {
    return this.request<{ response: string; citations: any[] }>('/chat', {
      method: 'POST',
      body: JSON.stringify({ message, history }),
    });
  }

  async submitFeedback(messageId: string, rating: 'like' | 'dislike'): Promise<ApiResponse<null>> {
    return this.request<null>('/chat/feedback', {
      method: 'POST',
      body: JSON.stringify({ messageId, rating }),
    });
  }
}

export const api = new ApiClient();

