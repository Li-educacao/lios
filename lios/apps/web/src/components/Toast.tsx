import { cn } from '../lib/utils';
import { useToast, type Toast } from '../contexts/ToastContext';

function ToastItem({ toast }: { toast: Toast }) {
  const { removeToast } = useToast();

  return (
    <div
      className={cn(
        'flex items-start gap-3 px-4 py-3 rounded-lg border shadow-xl text-sm font-body',
        'animate-in slide-in-from-right-4 duration-300',
        toast.variant === 'success' && 'bg-green-500/10 border-green-500/30 text-green-400',
        toast.variant === 'error' && 'bg-red-500/10 border-red-500/30 text-red-400',
        toast.variant === 'info' && 'bg-brand-blue/10 border-brand-blue/30 text-brand-blue'
      )}
    >
      <span className="flex-1">{toast.message}</span>
      <button
        onClick={() => removeToast(toast.id)}
        className="opacity-60 hover:opacity-100 transition-opacity leading-none shrink-0"
        aria-label="Fechar"
      >
        &#x2715;
      </button>
    </div>
  );
}

export function ToastContainer() {
  const { toasts } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-80 max-w-[calc(100vw-2rem)]">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
