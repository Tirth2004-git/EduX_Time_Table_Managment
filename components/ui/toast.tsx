'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning';
  duration?: number;
}

let toastId = 0;
const toastListeners: Array<(toast: Toast) => void> = [];

export function showToast(message: string, type: 'success' | 'error' | 'warning' = 'success', duration = 3000) {
  const id = `toast-${toastId++}`;
  const toast: Toast = { id, message, type, duration };
  toastListeners.forEach((listener) => listener(toast));
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const listener = (toast: Toast) => {
      setToasts((prev) => [...prev, toast]);
      if (toast.duration) {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== toast.id));
        }, toast.duration);
      }
    };

    toastListeners.push(listener);
    return () => {
      const index = toastListeners.indexOf(listener);
      if (index > -1) {
        toastListeners.splice(index, 1);
      }
    };
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            'flex items-center gap-3 p-4 rounded-lg shadow-lg min-w-[300px] max-w-[500px] animate-in slide-in-from-right',
            {
              'bg-green-50 border border-green-200 text-green-800': toast.type === 'success',
              'bg-red-50 border border-red-200 text-red-800': toast.type === 'error',
              'bg-yellow-50 border border-yellow-200 text-yellow-800': toast.type === 'warning',
            }
          )}
        >
          {toast.type === 'success' && <CheckCircle2 className="h-5 w-5 text-green-600" />}
          {toast.type === 'error' && <XCircle className="h-5 w-5 text-red-600" />}
          {toast.type === 'warning' && <AlertTriangle className="h-5 w-5 text-yellow-600" />}
          <p className="flex-1 text-sm font-medium">{toast.message}</p>
          <button
            onClick={() => removeToast(toast.id)}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

