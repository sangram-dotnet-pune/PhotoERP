import type { ButtonHTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'outline';
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  ariaLabel?: string;
}

const Button = ({
  children,
  variant = 'primary',
  loading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  ariaLabel,
  className,
  ...props
}: ButtonProps) => {
  const hasOnlyIcon = !children && (leftIcon || rightIcon);

  const resolvedAriaLabel = ariaLabel ?? (hasOnlyIcon ? String(children) : undefined);

  return (
    <button
      disabled={disabled || loading}
      aria-label={resolvedAriaLabel}
      aria-busy={loading}
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60',
        {
          'bg-blue-600 text-white hover:bg-blue-700':
            variant === 'primary',

          'bg-slate-200 text-slate-800 hover:bg-slate-300':
            variant === 'secondary',

          'bg-red-600 text-white hover:bg-red-700':
            variant === 'danger',

          'border border-slate-300 bg-white text-slate-700 hover:bg-slate-100':
            variant === 'outline',
        },
        className,
      )}
      {...props}
    >
      {loading ? (
        <>
          <div
            className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
            aria-hidden="true"
          />
          <span className="sr-only">Loading...</span>
        </>
      ) : (
        <>
          {leftIcon}
          {children}
          {rightIcon}
        </>
      )}
    </button>
  );
};

export default Button;