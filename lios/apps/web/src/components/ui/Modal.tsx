import { type ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}

function Modal({ isOpen, onClose, title, children, className }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/80" onClick={onClose} />
      <div
        className={cn(
          'relative z-10 w-full max-w-lg rounded-xl border border-brand-gray/20 bg-brand-black p-6 shadow-xl',
          className
        )}
      >
        {title && (
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-heading text-white">{title}</h2>
            <button
              onClick={onClose}
              className="text-brand-gray hover:text-white transition-colors"
            >
              &#x2715;
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

export { Modal };
