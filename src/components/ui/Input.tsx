import { useId, useState } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';
import { Eye, EyeOff } from 'lucide-react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

const Input = ({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  className,
  type = 'text',
  required,
  disabled,
  id: providedId,
  'aria-describedby': ariaDescribedBy,
  ...props
}: InputProps) => {
  const generatedId = useId();
  const id = providedId || generatedId;
  const errorId = `${id}-error`;
  const helperId = `${id}-helper`;

  const [showPassword, setShowPassword] = useState(false);

  const isPassword = type === 'password';

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

      <div
        className={clsx(
          'flex items-center rounded-xl border bg-white transition-all duration-200',
          error
            ? 'border-red-500 focus-within:border-red-500'
            : 'border-slate-300 focus-within:border-blue-500',
          disabled && 'cursor-not-allowed bg-slate-100',
        )}
      >
        {leftIcon && (
          <div className="pl-4 text-slate-400" aria-hidden="true">
            {leftIcon}
          </div>
        )}

        <input
          id={id}
          type={isPassword && showPassword ? 'text' : type}
          disabled={disabled}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={describedBy}
          className={clsx(
            'w-full bg-transparent px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400',
            className,
          )}
          {...props}
        />

        {isPassword ? (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="pr-4 text-slate-500 hover:text-slate-700"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            aria-pressed={showPassword}
          >
            {showPassword ? (
              <EyeOff size={18} aria-hidden="true" />
            ) : (
              <Eye size={18} aria-hidden="true" />
            )}
          </button>
        ) : (
          rightIcon && (
            <div className="pr-4 text-slate-400" aria-hidden="true">
              {rightIcon}
            </div>
          )
        )}
      </div>

      {error && (
        <p
          id={errorId}
          className="mt-2 text-sm text-red-500"
          role="alert"
          aria-live="polite"
        >
          {error}
        </p>
      )}

      {!error && helperText && (
        <p id={helperId} className="mt-2 text-sm text-slate-500">
          {helperText}
        </p>
      )}
    </div>
  );
};

export default Input;