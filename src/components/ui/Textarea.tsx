import { useId } from 'react';
import type { ReactNode, TextareaHTMLAttributes } from 'react';
import clsx from 'clsx';

interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  maxLength?: number;
  showCount?: boolean;
  leftIcon?: ReactNode;
}

const Textarea = ({
  label,
  error,
  helperText,
  required,
  maxLength,
  showCount = false,
  className,
  value,
  rows = 5,
  id: providedId,
  'aria-describedby': ariaDescribedBy,
  ...props
}: TextareaProps) => {
  const generatedId = useId();
  const id = providedId || generatedId;
  const errorId = `${id}-error`;
  const helperId = `${id}-helper`;

  const characterCount =
    typeof value === 'string' ? value.length : 0;

  const describedBy = [
    error ? errorId : null,
    helperText ? helperId : null,
    ariaDescribedBy,
  ]
    .filter(Boolean)
    .join(' ') || undefined;

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={id}
          className="mb-2 block text-sm font-medium text-slate-700"
        >
          {label}
          {required && (
            <span className="ml-1 text-red-500" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}

      <textarea
        id={id}
        rows={rows}
        value={value}
        maxLength={maxLength}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={describedBy}
        className={clsx(
          'w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all duration-200 placeholder:text-slate-400 resize-none',

          error
            ? 'border-red-500 focus:border-red-500'
            : 'border-slate-300 focus:border-blue-500',

          className,
        )}
        {...props}
      />

      <div className="mt-2 flex items-center justify-between">
        <div>
          {error ? (
            <p
              id={errorId}
              className="text-sm text-red-500"
              role="alert"
              aria-live="polite"
            >
              {error}
            </p>
          ) : (
            helperText && (
              <p id={helperId} className="text-sm text-slate-500">
                {helperText}
              </p>
            )
          )}
        </div>

        {showCount && maxLength && (
          <span className="text-xs text-slate-400">
            {characterCount}/{maxLength}
          </span>
        )}
      </div>
    </div>
  );
};

export default Textarea;