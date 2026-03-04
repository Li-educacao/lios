import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="text-sm font-subtitle text-brand-gray">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          className={cn(
            'w-full rounded-lg border bg-white/5 px-3 py-2 text-white placeholder:text-brand-gray/50 font-body resize-none',
            'focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent',
            'transition-colors',
            error ? 'border-red-500' : 'border-brand-gray/30',
            className
          )}
          {...props}
        />
        {error && (
          <span className="text-xs text-red-500">{error}</span>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
export { Textarea };
