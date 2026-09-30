import { useEffect, useMemo, useState } from 'react';

import {
  Wallet,
  Plus,
  Search,
  Pencil,
  Trash2,
  FileText,
} from 'lucide-react';
import { confirm } from '@tauri-apps/plugin-dialog';
import clsx from 'clsx';

import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import Input from '../../../components/ui/Input';
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
import type {
  Expense,
  ExpenseSummary,
} from '../types/expense.types';
import { EXPENSE_CATEGORIES } from '../types/expense.types';
import { quotationDisplayLabel } from '../types/expense.types';
import { formatExpenseDate, formatRupees } from '../utils/expenseFormat';
import ExpenseModal from '../components/ExpenseModal';

const DATE_PART_LENGTH = 10;
const datePart = (value: string) => value.slice(0, DATE_PART_LENGTH);

const typeColors: Record<string, string> = {
  General: 'bg-slate-100 text-slate-700',
  'Order Expense': 'bg-indigo-100 text-indigo-700',
};

const orderLabel = (expense: Expense) =>
  quotationDisplayLabel(
    expense.quotation_number ?? '',
    expense.client_name ?? '',
    expense.event_type ?? undefined,
  );

const ExpensesPage = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [summary, setSummary] = useState<ExpenseSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [quotationFilter, setQuotationFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  useEffect(() => {
    loadExpenses();
  }, []);

  const loadExpenses = async () => {
    try {
      setLoading(true);
      const [data, summaryData] = await Promise.all([
        expenseService.getExpenses(),
        expenseService.getExpenseSummary(),
      ]);
      setExpenses(data);
      setSummary(summaryData);
    } catch (error) {
      console.error(error);
      toastError('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  const availableCategories = useMemo(() => {
    const fromData = new Set(expenses.map((e) => e.category).filter(Boolean));
    return Array.from(
      new Set([...EXPENSE_CATEGORIES, ...Array.from(fromData)]),
    );
  }, [expenses]);

  const availableQuotations = useMemo(() => {
    const seen = new Map<number, Expense>();
    expenses.forEach((e) => {
      if (e.quotation_id !== null && !seen.has(e.quotation_id)) {
        seen.set(e.quotation_id, e);
      }
    });
    return Array.from(seen.values()).sort((a, b) =>
      (a.quotation_number ?? '').localeCompare(b.quotation_number ?? ''),
    );
  }, [expenses]);

  const filtered = useMemo(() => {
    return expenses.filter((e) => {
      const query = search.trim().toLowerCase();
      const matchesSearch =
        !query ||
        e.description.toLowerCase().includes(query) ||
        e.category.toLowerCase().includes(query) ||
        e.vendor.toLowerCase().includes(query) ||
        e.payment_method.toLowerCase().includes(query) ||
        (e.quotation_number ?? '').toLowerCase().includes(query) ||
        (e.client_name ?? '').toLowerCase().includes(query);

      const matchesCategory = !categoryFilter || e.category === categoryFilter;

      const isOrder = e.quotation_id !== null;
      const matchesType =
        !typeFilter ||
        (typeFilter === 'Order Expense' && isOrder) ||
        (typeFilter === 'General' && !isOrder);

      const matchesQuotation =
        !quotationFilter || String(e.quotation_id) === quotationFilter;

      const expenseDay = datePart(e.expense_date);
      const matchesFrom = !fromDate || expenseDay >= fromDate;
      const matchesTo = !toDate || expenseDay <= toDate;

      return (
        matchesSearch &&
        matchesCategory &&
        matchesType &&
        matchesQuotation &&
        matchesFrom &&
        matchesTo
      );
    });
  }, [
    expenses,
    search,
    categoryFilter,
    typeFilter,
    quotationFilter,
    fromDate,
    toDate,
  ]);

  const quotationSummary = useMemo(() => {
    if (!quotationFilter) return null;

    const selected = availableQuotations.find(
      (q) => String(q.quotation_id) === quotationFilter,
    );

    const total = filtered.reduce((sum, e) => sum + e.amount, 0);

    return {
      label: selected
        ? orderLabel(selected)
        : (availableQuotations[0] && orderLabel(availableQuotations[0])) ?? '',
      total,
    };
  }, [quotationFilter, availableQuotations, filtered]);

  const handleOpenAdd = () => {
    setEditingExpense(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setModalOpen(true);
  };

  const handleDelete = async (expense: Expense) => {
    const confirmed = await confirm(
      `Delete this "${expense.category}" expense of ${formatRupees(expense.amount)}?\n\n${expense.description || 'No description'}`,
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
      await expenseService.deleteExpense(expense.id);

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
        header: 'Date',
        accessor: 'expense_date',
        sortable: true,
        render: (row) => (
          <span className="text-slate-500">
            {row.expense_date ? formatExpenseDate(row.expense_date) : '—'}
          </span>
        ),
      },
      {
        header: 'Description',
        accessor: 'description',
        sortable: true,
        render: (row) => (
          <span className="font-medium text-slate-900" title={row.description}>
            {row.description || row.category || '—'}
          </span>
        ),
      },
      {
        header: 'Category',
        accessor: 'category',
        sortable: true,
        render: (row) => <span className="text-slate-600">{row.category}</span>,
      },
      {
        header: 'Type',
        render: (row) => {
          const isOrder = row.quotation_id !== null;
          const label = isOrder ? 'Order Expense' : 'General';
          return (
            <div className="space-y-1">
              <span
                className={clsx(
                  'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold',
                  typeColors[label],
                )}
              >
                {label}
              </span>
              {isOrder && (
                <span className="block text-xs text-slate-500">
                  / {orderLabel(row)}
                </span>
              )}
            </div>
          );
        },
      },
      {
        header: 'Order · Quotation',
        sortable: true,
        render: (row) =>
          row.quotation_id !== null && row.quotation_number ? (
            <span className="text-slate-700">
              {row.quotation_number} — {row.client_name ?? ''}
            </span>
          ) : (
            <span className="text-slate-400">—</span>
          ),
      },
      {
        header: 'Vendor',
        sortable: true,
        render: (row) =>
          row.vendor ? (
            <span className="text-slate-600">{row.vendor}</span>
          ) : (
            <span className="text-slate-400">—</span>
          ),
      },
      {
        header: 'Payment Method',
        render: (row) =>
          row.payment_method ? (
            <span className="text-slate-600">{row.payment_method}</span>
          ) : (
            <span className="text-slate-400">—</span>
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
        header: 'Actions',
        render: (row) => (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => handleOpenEdit(row)}
              aria-label={`Edit expense ${row.description || row.category}`}
            >
              <Pencil size={16} aria-hidden="true" />
            </Button>
            <Button
              variant="danger"
              onClick={() => handleDelete(row)}
              aria-label={`Delete expense ${row.description || row.category}`}
            >
              <Trash2 size={16} aria-hidden="true" />
            </Button>
          </div>
        ),
      },
    ],
    [],
  );

  const hasActiveFilters =
    Boolean(search) ||
    Boolean(categoryFilter) ||
    Boolean(typeFilter) ||
    Boolean(quotationFilter) ||
    Boolean(fromDate) ||
    Boolean(toDate);

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
            Track general and order-specific expenses for your photography
            business
          </p>
        </div>

        <Button
          leftIcon={<Plus size={18} aria-hidden="true" />}
          onClick={handleOpenAdd}
        >
          Add Expense
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Total Expenses
              </p>
              <p className="mt-1 text-2xl font-bold text-red-600">
                {formatRupees(summary?.total ?? 0)}
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
              <p className="text-sm font-medium text-slate-500">
                Order Expenses
              </p>
              <p className="mt-1 text-2xl font-bold text-indigo-600">
                {formatRupees(summary?.order_total ?? 0)}
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
              <FileText size={22} aria-hidden="true" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">
                General Expenses
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-800">
                {formatRupees(summary?.general_total ?? 0)}
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-600">
              <Wallet size={22} aria-hidden="true" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">
                This Month
              </p>
              <p className="mt-1 text-2xl font-bold text-blue-600">
                {formatRupees(summary?.this_month ?? 0)}
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600">
              <Wallet size={22} aria-hidden="true" />
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
          <div className="relative xl:col-span-2">
            <Search
              className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <Input
              placeholder="Search description, category, vendor, quotation..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
              aria-label="Search expenses"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            aria-label="Filter by category"
          >
            <option value="">All Categories</option>
            {availableCategories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            aria-label="Filter by expense type"
          >
            <option value="">All Types</option>
            <option value="General">General</option>
            <option value="Order Expense">Order Expense</option>
          </select>

          <select
            value={quotationFilter}
            onChange={(e) => setQuotationFilter(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            aria-label="Filter by quotation"
          >
            <option value="">All Orders</option>
            {availableQuotations.map((quotation) => (
              <option
                key={quotation.quotation_id}
                value={String(quotation.quotation_id)}
              >
                {orderLabel(quotation)}
              </option>
            ))}
          </select>

          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500"
              aria-label="From date"
            />
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500"
              aria-label="To date"
            />
          </div>
        </div>
      </Card>

      {quotationSummary && (
        <Card className="border-indigo-200 bg-indigo-50">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <div>
              <p className="text-sm font-medium text-indigo-600">
                Order Expenses Summary
              </p>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                Order: {quotationSummary.label}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">
                Total Order Expenses
              </p>
              <p className="mt-1 text-2xl font-bold text-indigo-700">
                {formatRupees(quotationSummary.total)}
              </p>
            </div>
          </div>
        </Card>
      )}

      <Table
        columns={columns}
        data={filtered}
        loading={loading}
        rowKey={(row) => String(row.id)}
        emptyState={
          filtered.length === 0 && hasActiveFilters ? (
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

      <ExpenseModal
        open={modalOpen}
        title={editingExpense ? 'Edit Expense' : 'Add Expense'}
        confirmText={editingExpense ? 'Save Changes' : 'Add Expense'}
        initial={editingExpense}
        onClose={() => {
          setModalOpen(false);
          setEditingExpense(null);
        }}
        onSaved={() => {
          setModalOpen(false);
          setEditingExpense(null);
          loadExpenses();
        }}
      />
    </div>
  );
};

export default ExpensesPage;