import { useId } from 'react';
import type { InputHTMLAttributes } from 'react';
import clsx from 'clsx';

interface ToggleProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  description?: string;
}

const Toggle = ({
  label,
  description,
  checked,
  onChange,
  disabled,
  id: providedId,
  ...props
}: ToggleProps) => {
  const generatedId = useId();
  const id = providedId || generatedId;

  return (
    <label
      htmlFor={id}
      className={clsx(
        'flex items-start justify-between gap-4 rounded-xl border border-slate-200 p-4',
        disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
      )}
    >
      {(label || description) && (
        <span className="min-w-0">
          {label && (
            <span className="block text-sm font-medium text-slate-900">
              {label}
            </span>
          )}

          {description && (
            <span className="mt-0.5 block text-sm text-slate-500">
              {description}
            </span>
          )}
        </span>
      )}

      <span
        className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2"
        style={{
          backgroundColor: checked ? '#2563eb' : '#cbd5e1',
        }}
      >
        <input
          type="checkbox"
          id={id}
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          className="sr-only"
          {...props}
        />
        <span
          aria-hidden="true"
          className={clsx(
            'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200',
            checked ? 'translate-x-6' : 'translate-x-1',
          )}
        />
      </span>
    </label>
  );
};

export default Toggle;