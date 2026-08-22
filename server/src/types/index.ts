export * from '../../../shared/types';

export interface CustomError extends Error {
  statusCode?: number;
  details?: any;
}
