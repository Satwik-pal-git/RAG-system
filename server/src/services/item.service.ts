import { Item, CreateItemDto, UpdateItemDto } from '../types';

/**
 * In-Memory Item Service
 * Ready-to-use business layer. In a real application, replace the in-memory array
 * with your database client (e.g. Prisma, TypeORM, Mongoose, Drizzle, etc.).
 */
class ItemService {
  private items: Item[] = [
    {
      id: '1',
      title: 'Initialize TypeScript Config',
      description: 'Configure strict TypeScript compilation for both React client and Node.js server.',
      category: 'task',
      priority: 'high',
      status: 'completed',
      createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 20).toISOString(),
    },
    {
      id: '2',
      title: 'Setup Monorepo & Dev Scripts',
      description: 'Configure concurrent execution to run client on :5173 and server on :5000.',
      category: 'feature',
      priority: 'urgent',
      status: 'completed',
      createdAt: new Date(Date.now() - 3600000 * 18).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 10).toISOString(),
    },
    {
      id: '3',
      title: 'Connect Database Layer',
      description: 'Connect PostgreSQL / MongoDB or SQLite using your preferred ORM (Prisma/Drizzle/Mongoose).',
      category: 'task',
      priority: 'medium',
      status: 'in_progress',
      createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    },
    {
      id: '4',
      title: 'Implement User Authentication',
      description: 'Add JWT or session-based authentication routes and middleware for protected endpoints.',
      category: 'feature',
      priority: 'high',
      status: 'pending',
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      updatedAt: new Date(Date.now() - 3600000).toISOString(),
    },
  ];

  /**
   * Get all items with optional filtering and search
   */
  async getAll(query?: { search?: string; category?: string; status?: string }): Promise<Item[]> {
    let result = [...this.items];

    if (query?.category) {
      result = result.filter((item) => item.category === query.category);
    }

    if (query?.status) {
      result = result.filter((item) => item.status === query.status);
    }

    if (query?.search) {
      const searchLower = query.search.toLowerCase();
      result = result.filter(
        (item) =>
          item.title.toLowerCase().includes(searchLower) ||
          item.description.toLowerCase().includes(searchLower)
      );
    }

    // Sort newest first
    return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Get single item by ID
   */
  async getById(id: string): Promise<Item | null> {
    const item = this.items.find((i) => i.id === id);
    return item || null;
  }

  /**
   * Create a new item
   */
  async create(dto: CreateItemDto): Promise<Item> {
    const newItem: Item = {
      id: Date.now().toString(36) + Math.random().toString(36).substring(2, 7),
      title: dto.title.trim(),
      description: dto.description.trim(),
      category: dto.category,
      priority: dto.priority,
      status: dto.status || 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.items.unshift(newItem);
    return newItem;
  }

  /**
   * Update an existing item
   */
  async update(id: string, dto: UpdateItemDto): Promise<Item | null> {
    const index = this.items.findIndex((i) => i.id === id);
    if (index === -1) return null;

    const existing = this.items[index];
    const updated: Item = {
      ...existing,
      ...dto,
      title: dto.title !== undefined ? dto.title.trim() : existing.title,
      description: dto.description !== undefined ? dto.description.trim() : existing.description,
      updatedAt: new Date().toISOString(),
    };

    this.items[index] = updated;
    return updated;
  }

  /**
   * Delete an item by ID
   */
  async delete(id: string): Promise<boolean> {
    const initialLength = this.items.length;
    this.items = this.items.filter((i) => i.id !== id);
    return this.items.length < initialLength;
  }

  /**
   * Reset sample data
   */
  async reset(): Promise<Item[]> {
    this.items = [
      {
        id: '1',
        title: 'Initialize TypeScript Config',
        description: 'Configure strict TypeScript compilation for both React client and Node.js server.',
        category: 'task',
        priority: 'high',
        status: 'completed',
        createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
        updatedAt: new Date(Date.now() - 3600000 * 20).toISOString(),
      },
      {
        id: '2',
        title: 'Setup Monorepo & Dev Scripts',
        description: 'Configure concurrent execution to run client on :5173 and server on :5000.',
        category: 'feature',
        priority: 'urgent',
        status: 'completed',
        createdAt: new Date(Date.now() - 3600000 * 18).toISOString(),
        updatedAt: new Date(Date.now() - 3600000 * 10).toISOString(),
      },
    ];
    return this.items;
  }
}

export const itemService = new ItemService();
