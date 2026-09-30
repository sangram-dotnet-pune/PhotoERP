import { useEffect, useMemo, useRef, useState } from 'react';

import { Search, X } from 'lucide-react';
import clsx from 'clsx';

import { quotationService } from '../../../services/quotation.service';
import type { QuotationListItem } from '../../quotations/types/quotationList.types';
import { quotationDisplayLabel } from '../types/expense.types';

interface QuotationSelectProps {
  value: number | null;
  onChange: (quotationId: number) => void;
  disabled?: boolean;
  label?: string;
  required?: boolean;
  error?: string;
  id?: string;
}

const optionLabel = (q: QuotationListItem) =>
  quotationDisplayLabel(q.quotation_number, q.client_name, q.event_type);

const QuotationSelect = ({
  value,
  onChange,
  disabled = false,
  label,
  required = false,
  error,
  id,
}: QuotationSelectProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [quotations, setQuotations] = useState<QuotationListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;

    setLoading(true);
    quotationService
      .getQuotations()
      .then((data) => {
        if (active) setQuotations(data);
      })
      .catch((err) => {
        console.error(err);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const selected = quotations.find((q) => q.id === value) ?? null;

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return quotations;

    return quotations.filter(
      (q) =>
        optionLabel(q).toLowerCase().includes(query) ||
        q.quotation_number.toLowerCase().includes(query) ||
        q.client_name.toLowerCase().includes(query),
    );
  }, [quotations, search]);

  return (
    <div
      ref={wrapperRef}
      className="w-full"
      onFocus={() => setOpen(true)}
      onBlur={(e) => {
        if (!wrapperRef.current?.contains(e.relatedTarget as Node)) {
          setOpen(false);
        }
      }}
    >
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
            ? 'border-red-500'
            : 'border-slate-300 focus-within:border-blue-500',
          disabled && 'cursor-not-allowed bg-slate-100',
        )}
      >
        <div className="pl-4 text-slate-400" aria-hidden="true">
          <Search size={18} />
        </div>

        <input
          id={id}
          type="text"
          value={selected ? optionLabel(selected) : search}
          disabled={disabled}
          placeholder="Search quotation (number, client)..."
          onChange={(e) => {
            setSearch(e.target.value);
            if (value !== null) onChange(0);
          }}
          onFocus={() => setOpen(true)}
          aria-invalid={Boolean(error)}
          className="w-full bg-transparent px-3 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400"
        />

        {selected && !disabled ? (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              onChange(0);
              setSearch('');
            }}
            className="pr-3 text-slate-400 hover:text-slate-600"
            aria-label="Clear selected quotation"
          >
            <X size={16} aria-hidden="true" />
          </button>
        ) : null}
      </div>

      {open && (
        <ul className="mt-1 max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-sm">
          {loading && (
            <li className="px-4 py-3 text-sm text-slate-500">
              Loading quotations...
            </li>
          )}

          {!loading && filtered.length === 0 && (
            <li className="px-4 py-3 text-sm text-slate-500">
              No matching quotations found.
            </li>
          )}

          {!loading &&
            filtered.map((q) => (
              <li key={q.id}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onChange(q.id);
                    setOpen(false);
                    setSearch('');
                  }}
                  className={clsx(
                    'w-full px-4 py-2.5 text-left text-sm hover:bg-blue-50',
                    value === q.id
                      ? 'bg-blue-50 font-medium text-blue-700'
                      : 'text-slate-700',
                  )}
                >
                  {optionLabel(q)}
                </button>
              </li>
            ))}
        </ul>
      )}

      {error && (
        <p className="mt-2 text-sm text-red-500" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

export default QuotationSelect;