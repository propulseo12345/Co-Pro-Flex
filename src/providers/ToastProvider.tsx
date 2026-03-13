'use client';

import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { Toast, type ToastItem } from '@/components/ui/Toast/Toast';
import styles from '@/components/ui/Toast/Toast.module.css';

interface ToastContextValue {
  showToast: (params: { type: 'success' | 'error' | 'info'; message: string; link?: { label: string; href: string } }) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) { clearTimeout(timer); timersRef.current.delete(id); }
  }, []);

  const showToast = useCallback(({ type, message, link }: { type: 'success' | 'error' | 'info'; message: string; link?: { label: string; href: string } }) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const duration = type === 'error' ? 6000 : 4000;
    setToasts(prev => [...prev, { id, type, message, link }]);
    const timer = setTimeout(() => removeToast(id), duration);
    timersRef.current.set(id, timer);
  }, [removeToast]);

  useEffect(() => {
    return () => { timersRef.current.forEach(t => clearTimeout(t)); };
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toasts.length > 0 && (
        <div className={styles.toastContainer}>
          {toasts.map(t => <Toast key={t.id} toast={t} onClose={removeToast} />)}
        </div>
      )}
    </ToastContext.Provider>
  );
}
