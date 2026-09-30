import { useEffect, useState } from 'react';
import clsx from 'clsx';

import Modal from '../../../components/ui/Modal';
import Input from '../../../components/ui/Input';
import Textarea from '../../../components/ui/Textarea';
import {
  toastSuccess,
  toastError,
  toastLoading,
  toastDismiss,
} from '../../../utils/toast';

import { expenseService } from '../../../services/expense.service';
import type {
  CreateExpenseRequest,
  Expense,
  ExpenseType,
} from '../types/expense.types';
import { EXPENSE_TYPES } from '../types/expense.types';
import { EXPENSE_CATEGORIES } from '../types/expense.types';
import { PAYMENT_METHODS } from '../types/expense.types';
import type { ExpenseFormValues } from '../types/expenseForm.types';
import { useExpenseValidation } from '../hooks/useExpenseValidation';
import { toDateTimeLocal, toInputValue } from '../utils/expenseFormat';
import QuotationSelect from './QuotationSelect';

interface ExpenseModalProps {
  open: boolean;
  title: string;
  confirmText?: string;
  presetType?: ExpenseType;
  presetQuotationId?: number | null;
  initial?: Expense | null;
  onClose: () => void;
  onSaved: () => void;
}

const defaultForm = (preset: {
  presetType?: ExpenseType;
  presetQuotationId?: number | null;
}): ExpenseFormValues => {
  const isOrder = preset.presetType === 'Order Expense';
  return {
    expenseType: preset.presetType ?? 'General',
    quotationId: isOrder ? preset.presetQuotationId ?? null : null,
    expense_date: toDateTimeLocal(new Date()),
    category: '',
    description: '',
    amount: 0,
    payment_method: '',
    vendor: '',
    notes: '',
  };
};

const fromExpense = (expense: Expense): ExpenseFormValues => ({
  expenseType: expense.quotation_id ? 'Order Expense' : 'General',
  quotationId: expense.quotation_id,
  expense_date: toInputValue(expense.expense_date),
  category: expense.category,
  description: expense.description,
  amount: expense.amount,
  payment_method: expense.payment_method,
  vendor: expense.vendor,
  notes: expense.notes,
});

const selectClasses = (invalid: boolean) =>
  clsx(
    'w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all duration-200',
    invalid
      ? 'border-red-500'
      : 'border-slate-300 focus:border-blue-500',
  );

const ExpenseModal = ({
  open,
  title,
  confirmText = 'Add Expense',
  presetType,
  presetQuotationId,
  initial,
  onClose,
  onSaved,
}: ExpenseModalProps) => {
  const [form, setForm] = useState<ExpenseFormValues>(() =>
    defaultForm({ presetType, presetQuotationId }),
  );
  const [saving, setSaving] = useState(false);
  const validation = useExpenseValidation();

  useEffect(() => {
    if (!open) return;

    const next = initial ? fromExpense(initial) : defaultForm({ presetType, presetQuotationId });
    setForm(next);
    validation.clearErrors();
  }, [open]);

  const updateField = <K extends keyof ExpenseFormValues>(
    field: K,
    value: ExpenseFormValues[K],
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleTypeChange = (expenseType: ExpenseType) => {
    setForm((prev) => ({
      ...prev,
      expenseType,
      quotationId:
        expenseType === 'Order Expense' && prev.quotationId === null
          ? presetQuotationId ?? null
          : expenseType === 'General'
          ? null
          : prev.quotationId,
    }));
    validation.touchField('expenseType');
    validation.validateField('expenseType', { ...form, expenseType });
  };

  const handleSave = async () => {
    const isValid = validation.validate(form);
    if (!isValid) {
      toastError('Please fill in all required fields before saving.');
      return;
    }

    const isEdit = Boolean(initial);

    const payload: CreateExpenseRequest = {
      quotation_id:
        form.expenseType === 'Order Expense' ? form.quotationId : null,
      expense_date: form.expense_date,
      category: form.category,
      description: form.description,
      amount: form.amount,
      payment_method: form.payment_method,
      vendor: form.vendor,
      notes: form.notes,
    };

    const toastId = toastLoading(isEdit ? 'Updating expense...' : 'Adding expense...');

    try {
      setSaving(true);

      if (isEdit && initial) {
        await expenseService.updateExpense({ id: initial.id, ...payload });
      } else {
        await expenseService.createExpense(payload);
      }

      toastDismiss(toastId);
      toastSuccess(
        isEdit ? 'Expense updated successfully' : 'Expense added successfully',
      );
      onClose();
      onSaved();
    } catch (error) {
      console.error(error);

      toastDismiss(toastId);
      toastError(
        typeof error === 'string'
          ? error
          : isEdit
          ? 'Failed to update expense'
          : 'Failed to add expense',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      title={title}
      size="lg"
      onClose={onClose}
      onConfirm={handleSave}
      confirmText={confirmText}
      loading={saving}
    >
      <div className="space-y-4">
        <div>
          <span className="mb-2 block text-sm font-medium text-slate-700">
            Expense Type
            <span className="ml-1 text-red-500" aria-hidden="true">
              *
            </span>
          </span>
          <div className="grid grid-cols-2 gap-2">
            {EXPENSE_TYPES.map((type) => {
              const active = form.expenseType === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleTypeChange(type)}
                  aria-pressed={active}
                  className={clsx(
                    'rounded-xl border px-4 py-3 text-sm font-medium transition-all duration-200',
                    active
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50',
                  )}
                >
                  {type}
                </button>
              );
            })}
          </div>
          {validation.touched.expenseType && validation.errors.expenseType && (
            <p className="mt-2 text-sm text-red-500" role="alert">
              {validation.errors.expenseType}
            </p>
          )}
        </div>

        {form.expenseType === 'Order Expense' && (
          <QuotationSelect
            id="expense-quotation"
            label="Order / Quotation"
            required
            value={form.quotationId}
            onChange={(quotationId) => {
              updateField('quotationId', quotationId || null);
              if (quotationId) {
                const next = { ...form, quotationId };
                validation.touchField('quotation');
                validation.validateField('quotation', next);
              }
            }}
            error={
              validation.touched.quotation ? validation.errors.quotation : undefined
            }
          />
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            label="Date"
            type="datetime-local"
            value={form.expense_date}
            onChange={(e) => updateField('expense_date', e.target.value)}
            onBlur={() => {
              validation.touchField('expenseDate');
              validation.validateField('expenseDate', form);
            }}
            error={
              validation.touched.expenseDate
                ? validation.errors.expenseDate
                : undefined
            }
            helperText="Defaulted to the current date and time."
            required
          />

          <Input
            label="Amount"
            type="number"
            min={0.01}
            step="0.01"
            placeholder="0.00"
            value={form.amount}
            onChange={(e) => {
              const val = e.target.value;
              updateField('amount', val === '' ? 0 : Number(val));
            }}
            onBlur={() => {
              validation.touchField('amount');
              validation.validateField('amount', form);
            }}
            error={validation.touched.amount ? validation.errors.amount : undefined}
            required
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label
              htmlFor="expense-category"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Category
              <span className="ml-1 text-red-500" aria-hidden="true">
                *
              </span>
            </label>
            <select
              id="expense-category"
              value={form.category}
              onChange={(e) => updateField('category', e.target.value)}
              onBlur={() => {
                validation.touchField('category');
                validation.validateField('category', form);
              }}
              className={selectClasses(
                validation.touched.category && !!validation.errors.category,
              )}
            >
              <option value="">Select category</option>
              {EXPENSE_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            {validation.touched.category && validation.errors.category && (
              <p className="mt-2 text-sm text-red-500" role="alert">
                {validation.errors.category}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="expense-payment-method"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Payment Method
            </label>
            <select
              id="expense-payment-method"
              value={form.payment_method}
              onChange={(e) => updateField('payment_method', e.target.value)}
              className={selectClasses(false)}
            >
              <option value="">Not specified</option>
              {PAYMENT_METHODS.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </select>
          </div>
        </div>

        <Input
          label="Description"
          placeholder="What was this expense for?"
          value={form.description}
          onChange={(e) => updateField('description', e.target.value)}
        />

        <Input
          label="Vendor"
          placeholder="Paid to"
          value={form.vendor}
          onChange={(e) => updateField('vendor', e.target.value)}
        />

        <Textarea
          label="Notes"
          rows={3}
          placeholder="Any additional details (optional)"
          value={form.notes}
          onChange={(e) => updateField('notes', e.target.value)}
        />
      </div>
    </Modal>
  );
};

export default ExpenseModal;