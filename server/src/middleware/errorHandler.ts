import { Request, Response, NextFunction } from 'express';
import { ApiResponse, CustomError } from '../types';

export const notFoundHandler = (req: Request, res: Response<ApiResponse<null>>) => {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.originalUrl}`,
    timestamp: new Date().toISOString(),
  });
};

export const errorHandler = (
  err: CustomError,
  req: Request,
  res: Response<ApiResponse<null>>,
  next: NextFunction
) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  console.error(`[Error] ${req.method} ${req.originalUrl}:`, err);

  res.status(statusCode).json({
    success: false,
    error: message,
    timestamp: new Date().toISOString(),
  });
};
