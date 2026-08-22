export * from '../../../shared/types';

export type ActiveTab = 'dashboard' | 'chat' | 'documents';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
}
