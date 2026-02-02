import { useEffect } from 'react';

interface ToastItem {
  id: number;
  message: string;
  type: 'error' | 'success';
}

interface Props {
  toasts: ToastItem[];
  onDismiss: (id: number) => void;
}

export type { ToastItem };

export function ToastContainer({ toasts, onDismiss }: Props) {
  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function Toast({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: number) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return (
    <div className={`toast toast-${toast.type}`} onClick={() => onDismiss(toast.id)}>
      <span className="toast-message">{toast.message}</span>
      <button className="toast-close">×</button>
    </div>
  );
}
