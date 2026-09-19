import { useEffect, useMemo, useState } from 'react';

import { Wallet, Plus, Search, Pencil, Trash2, Eye } from 'lucide-react';
import { confirm } from '@tauri-apps/plugin-dialog';

import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import Input from '../../../components/ui/Input';
import Modal from '../../../components/ui/Modal';
import Table, { TableColumn } from '../../../components/ui/Table';
import EmptyState from '../../../components/ui/EmptyState';
import LoadingState from '../../../components/ui/LoadingState';
import {
  toastSuccess,
  toastError,
  toastLoading,
  toastDismiss,
} from '../../../utils/toast';

import { expenseService } from '../../../services/expense.service';
import { EXPENSE_TYPES } from '../types/expense.types';
import type { Expense, ExpenseFormState } from '../types/expense.types';
import { useExpenseValidation } from '../hooks/useExpenseValidation';

const formatRupees = (value: number) =>
  `₹${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const toInputValue = (value: string) => {
  if (!value) return '';
  const normalized = value.replace(' ', 'T');
  return normalized.length > 16 ? normalized.slice(0, 16) : normalized;
};

const toDateTimeLocal = (date: Date) => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
};

const defaultForm = (): ExpenseFormState => ({
  expense_type: 'Other',
  note: '',
  amount: 0,
  expense_date: toDateTimeLocal(new Date()),
});

const touchedFieldMap: Record<
  keyof ExpenseFormState,
  'expenseType' | 'note' | 'amount' | 'expenseDate'
> = {
  expense_type: 'expenseType',
  note: 'note',
  amount: 'amount',
  expense_date: 'expenseDate',
};

const typeColors: Record<string, string> = {
  Person: 'bg-blue-100 text-blue-700',
  Equipment: 'bg-purple-100 text-purple-700',
  Other: 'bg-slate-100 text-slate-700',
};

const ExpensesPage = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ExpenseFormState>(defaultForm());
  const [saving, setSaving] = useState(false);

  const validation = useExpenseValidation();

  const filtered = useMemo(() => {
    return expenses.filter((e) => {
      const matchesSearch =
        e.note.toLowerCase().includes(search.toLowerCase()) ||
        e.expense_type.toLowerCase().includes(search.toLowerCase());

      const matchesType = !typeFilter || e.expense_type === typeFilter;

      return matchesSearch && matchesType;
    });
  }, [expenses, search, typeFilter]);

  const totalExpenses = useMemo(() => {
    return expenses.reduce((sum, e) => sum + e.amount, 0);
  }, [expenses]);

  useEffect(() => {
    loadExpenses();
  }, []);

  const loadExpenses = async () => {
    try {
      setLoading(true);
      const data = await expenseService.getExpenses();
      setExpenses(data);
    } catch (error) {
      console.error(error);
      toastError('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm(defaultForm());
    setEditingId(null);
    validation.clearErrors();
  };

  const handleOpenAdd = () => {
    resetForm();
    setModalOpen(true);
  };

  const handleOpenEdit = (expense: Expense) => {
    validation.clearErrors();
    setEditingId(expense.id);
    setForm({
      expense_type: expense.expense_type,
      note: expense.note,
      amount: expense.amount,
      expense_date: toInputValue(expense.expense_date),
    });
    setModalOpen(true);
  };

  const updateField = <K extends keyof ExpenseFormState>(
    field: K,
    value: ExpenseFormState[K],
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleBlur = (field: keyof ExpenseFormState) => {
    const touchedKey = touchedFieldMap[field];
    validation.touchField(touchedKey);
    validation.validateField(touchedKey, form);
  };

  const handleSave = async () => {
    const isValid = validation.validate(form);
    if (!isValid) {
      toastError('Please fill in all required fields before saving.');
      return;
    }

    const toastId = toastLoading(editingId ? 'Updating expense...' : 'Adding expense...');

    try {
      setSaving(true);

      if (editingId !== null) {
        await expenseService.updateExpense({
          id: editingId,
          ...form,
        });
      } else {
        await expenseService.addExpense(form);
      }

      toastDismiss(toastId);
      toastSuccess(editingId ? 'Expense updated successfully' : 'Expense added successfully');

      setModalOpen(false);
      resetForm();
      await loadExpenses();
    } catch (error) {
      console.error(error);

      toastDismiss(toastId);
      toastError(
        typeof error === 'string'
          ? error
          : editingId
          ? 'Failed to update expense'
          : 'Failed to add expense',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (expense: Expense) => {
    const confirmed = await confirm(
      `Delete this "${expense.expense_type}" expense of ${formatRupees(expense.amount)}?\n\nNote: ${expense.note}`,
      {
        title: 'Delete Expense',
        kind: 'warning',
        okLabel: 'Delete',
        cancelLabel: 'Cancel',
      },
    );

    if (!confirmed) return;

    const toastId = toastLoading('Deleting expense...');

    try {
      await expenseService.deleteExpense(expense.id as number);

      toastDismiss(toastId);
      toastSuccess('Expense deleted successfully');

      await loadExpenses();
    } catch (error) {
      console.error(error);

      toastDismiss(toastId);
      toastError(typeof error === 'string' ? error : 'Failed to delete expense');
    }
  };

  const columns: TableColumn<Expense>[] = useMemo(
    () => [
      {
        header: 'Type',
        accessor: 'expense_type',
        sortable: true,
        render: (row) => (
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
              typeColors[row.expense_type] || typeColors.Other
            }`}
          >
            {row.expense_type}
          </span>
        ),
      },
      {
        header: 'Note',
        accessor: 'note',
        sortable: true,
        render: (row) => (
          <span className="font-medium text-slate-900" title={row.note}>
            {row.note}
          </span>
        ),
      },
      {
        header: 'Amount',
        accessor: 'amount',
        sortable: true,
        cellClassName: 'text-right font-semibold',
        render: (row) => formatRupees(row.amount),
      },
      {
        header: 'Date',
        accessor: 'expense_date',
        sortable: true,
        render: (row) => (
          <span className="text-slate-500">
            {row.expense_date ? row.expense_date.replace('T', ' ') : '—'}
          </span>
        ),
      },
      {
        header: 'Actions',
        render: (row) => (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => handleOpenEdit(row)}
              aria-label={`Edit expense ${row.note}`}
            >
              <Pencil size={16} aria-hidden="true" />
            </Button>
            <Button
              variant="danger"
              onClick={() => handleDelete(row)}
              aria-label={`Delete expense ${row.note}`}
            >
              <Trash2 size={16} aria-hidden="true" />
            </Button>
          </div>
        ),
      },
    ],
    []
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <LoadingState skeleton columns={5} skeletonRows={5} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold">
            <Wallet size={28} className="text-blue-600" aria-hidden="true" />
            Expenses
          </h1>
          <p className="text-slate-500">
            Track your photography business expenses
          </p>
        </div>

        <Button
          leftIcon={<Plus size={18} aria-hidden="true" />}
          onClick={handleOpenAdd}
        >
          Add Expense
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Total Expenses</p>
              <p className="mt-1 text-2xl font-bold text-red-600">
                {formatRupees(totalExpenses)}
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
              <Wallet size={22} aria-hidden="true" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Total Entries</p>
              <p className="mt-1 text-2xl font-bold text-slate-800">
                {expenses.length}
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-600">
              <Eye size={22} aria-hidden="true" />
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search
              className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <Input
              placeholder="Search expenses by note or type..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
              aria-label="Search expenses"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 md:w-48"
            aria-label="Filter by expense type"
          >
            <option value="">All Types</option>
            {EXPENSE_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
      </Card>

      <Table
        columns={columns}
        data={filtered}
        loading={loading}
        rowKey={(row) => String(row.id)}
        emptyState={
          filtered.length === 0 && (search || typeFilter) ? (
            <EmptyState
              title="No matching expenses found"
              description="Try changing your search or filters."
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              title="No expenses yet"
              description="Add your first expense to start tracking spending."
              action={{
                label: 'Add Expense',
                onClick: handleOpenAdd,
                leftIcon: <Plus size={18} aria-hidden="true" />,
              }}
            />
          ) : undefined
        }
      />

      <Modal
        open={modalOpen}
        title={editingId !== null ? 'Edit Expense' : 'Add Expense'}
        onClose={() => {
          setModalOpen(false);
          resetForm();
        }}
        onConfirm={handleSave}
        confirmText={editingId !== null ? 'Save Changes' : 'Add Expense'}
        loading={saving}
      >
        <div className="space-y-4">
          <div>
            <label
              htmlFor="expense-type"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Type
              <span className="ml-1 text-red-500" aria-hidden="true">
                *
              </span>
            </label>
            <select
              id="expense-type"
              value={form.expense_type}
              onChange={(e) => updateField('expense_type', e.target.value)}
              onBlur={() => handleBlur('expense_type')}
              aria-invalid={validation.touched.expenseType && !!validation.errors.expenseType}
              aria-describedby={
                validation.touched.expenseType && validation.errors.expenseType
                  ? 'expense-type-error'
                  : undefined
              }
              className={`w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all duration-200 ${
                validation.touched.expenseType && validation.errors.expenseType
                  ? 'border-red-500'
                  : 'border-slate-300 focus:border-blue-500'
              }`}
            >
              {EXPENSE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            {validation.touched.expenseType && validation.errors.expenseType && (
              <p
                id="expense-type-error"
                className="mt-2 text-sm text-red-500"
                role="alert"
              >
                {validation.errors.expenseType}
              </p>
            )}
          </div>

          <Input
            label="Note"
            placeholder="What was this expense for?"
            value={form.note}
            onChange={(e) => updateField('note', e.target.value)}
            onBlur={() => handleBlur('note')}
            error={
              validation.touched.note ? validation.errors.note : undefined
            }
            required
          />

          <Input
            label="Amount"
            type="number"
            min={0}
            step="0.01"
            placeholder="0.00"
            value={form.amount}
            onChange={(e) => {
              const val = e.target.value;
              updateField('amount', val === '' ? 0 : Number(val));
            }}
            onBlur={() => handleBlur('amount')}
            error={
              validation.touched.amount ? validation.errors.amount : undefined
            }
            required
          />

          <Input
            label="Date"
            type="datetime-local"
            value={form.expense_date}
            onChange={(e) => updateField('expense_date', e.target.value)}
            onBlur={() => handleBlur('expense_date')}
            error={
              validation.touched.expenseDate
                ? validation.errors.expenseDate
                : undefined
            }
            helperText="Defaulted to the current date and time."
            required
          />
        </div>
      </Modal>
    </div>
  );
};

export default ExpensesPage;