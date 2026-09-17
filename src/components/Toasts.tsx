import type { Toast } from '../lib/types';

export function Toasts({ toasts }: { toasts: (Toast & { id: number })[] }) {
  if (toasts.length === 0) return null;
  return (
    <div className="toasts">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast ${toast.tone}`}>
          <span className="bar" />
          <span>{toast.message}</span>
        </div>
      ))}
    </div>
  );
}
