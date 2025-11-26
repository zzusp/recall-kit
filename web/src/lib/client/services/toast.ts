import { create } from 'zustand';
import { ReactNode } from 'react';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  duration?: number;
  persistent?: boolean;
}

interface ToastState {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  clearAll: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (toast) =>
    set((state) => ({
      toasts: [
        ...state.toasts,
        {
          ...toast,
          id: Math.random().toString(36).substr(2, 9),
          duration: toast.duration ?? 5000,
        },
      ],
    })),
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    })),
  clearAll: () => set({ toasts: [] }),
}));

export const toast = {
  success: (message: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'message'>>) => {
    useToastStore.getState().addToast({ type: 'success', message, ...options });
  },
  error: (message: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'message'>>) => {
    useToastStore.getState().addToast({ type: 'error', message, ...options });
  },
  warning: (message: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'message'>>) => {
    useToastStore.getState().addToast({ type: 'warning', message, ...options });
  },
  info: (message: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'message'>>) => {
    useToastStore.getState().addToast({ type: 'info', message, ...options });
  },
};