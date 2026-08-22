import { Request, Response } from 'express';
import os from 'os';
import { ApiResponse, HealthStatus, AppInfo } from '../types';

export const getHealth = (req: Request, res: Response<ApiResponse<HealthStatus>>) => {
  const memoryUsage = process.memoryUsage();

  const healthData: HealthStatus = {
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    memory: {
      heapUsed: `${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
      heapTotal: `${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
      rss: `${(memoryUsage.rss / 1024 / 1024).toFixed(2)} MB`,
    },
    timestamp: new Date().toISOString(),
  };

  res.status(200).json({
    success: true,
    message: 'Backend server is healthy and responding',
    data: healthData,
    timestamp: new Date().toISOString(),
  });
};

export const getAppInfo = (req: Request, res: Response<ApiResponse<AppInfo>>) => {
  const infoData: AppInfo = {
    name: 'Universal React + Node.js + TypeScript Starter',
    version: '1.0.0',
    description: 'A modular, high-performance full-stack template ready for any project.',
    endpoints: [
      { method: 'GET', path: '/api/health', description: 'Server health and system status' },
      { method: 'GET', path: '/api/info', description: 'Application metadata and available endpoints' },
      { method: 'GET', path: '/api/items', description: 'List items with optional filters (?search, ?category, ?status)' },
      { method: 'GET', path: '/api/items/:id', description: 'Get a specific item by ID' },
      { method: 'POST', path: '/api/items', description: 'Create a new item' },
      { method: 'PUT', path: '/api/items/:id', description: 'Update an existing item' },
      { method: 'DELETE', path: '/api/items/:id', description: 'Delete an item by ID' },
      { method: 'POST', path: '/api/items/reset', description: 'Reset demo sample data' },
    ],
  };

  res.status(200).json({
    success: true,
    message: 'Application information retrieved successfully',
    data: infoData,
    timestamp: new Date().toISOString(),
  });
};
