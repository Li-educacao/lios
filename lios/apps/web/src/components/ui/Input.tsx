import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="text-sm font-subtitle text-brand-gray">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            'h-10 w-full rounded-lg border bg-white/5 px-3 text-white placeholder:text-brand-gray/50 font-body',
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

Input.displayName = 'Input';
export { Input };
