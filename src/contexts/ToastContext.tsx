import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

type ToastType = 'success' | 'info' | 'error';

interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, options?: { type?: ToastType; duration?: number }) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, options?: { type?: ToastType; duration?: number }) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const type: ToastType = options?.type || 'info';
    const duration = options?.duration ?? 2000;
    setToasts(prev => [...prev, { id, message, type }]);
    window.setTimeout(() => removeToast(id), duration);
  }, [removeToast]);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Toast Container */}
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 px-4">
        {toasts.map(t => (
          <div
            key={t.id}
            className={
              `w-fit max-w-[95vw] break-words whitespace-normal rounded-full shadow-lg px-4 py-2 text-sm font-semibold text-center ` +
              (t.type === 'success' ? 'bg-green-600 text-white' : t.type === 'error' ? 'bg-red-600 text-white' : 'bg-gray-900 text-white')
            }
            role="status"
            aria-live="polite"
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

