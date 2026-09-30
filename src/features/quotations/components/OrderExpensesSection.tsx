import { useEffect, useState } from 'react';

import { Plus, Pencil, Trash2, TrendingUp, Wallet, FileText } from 'lucide-react';
import { confirm } from '@tauri-apps/plugin-dialog';

import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
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
  QuotationProfitability,
} from '../../expenses/types/expense.types';
import { quotationDisplayLabel } from '../../expenses/types/expense.types';
import {
  formatExpenseDate,
  formatRupees,
} from '../../expenses/utils/expenseFormat';
import ExpenseModal from '../../expenses/components/ExpenseModal';

interface OrderExpensesSectionProps {
  quotationId: number;
}

const profitColors = (profit: number) =>
  profit >= 0
    ? 'text-emerald-600'
    : 'text-red-600';

const OrderExpensesSection = ({
  quotationId,
}: OrderExpensesSectionProps) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [profitability, setProfitability] =
    useState<QuotationProfitability | null>(null);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  useEffect(() => {
    loadData();
  }, [quotationId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [expenseData, profitData] = await Promise.all([
        expenseService.getExpensesByQuotation(quotationId),
        expenseService.getQuotationProfitability(quotationId),
      ]);
      setExpenses(expenseData);
      setProfitability(profitData);
    } catch (error) {
      console.error(error);
      toastError('Failed to load order expenses');
    } finally {
      setLoading(false);
    }
  };

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
      `Delete this "${expense.category}" order expense of ${formatRupees(expense.amount)}?\n\n${expense.description || 'No description'}`,
      {
        title: 'Delete Order Expense',
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
      toastSuccess('Order expense deleted successfully');

      await loadData();
    } catch (error) {
      console.error(error);

      toastDismiss(toastId);
      toastError(typeof error === 'string' ? error : 'Failed to delete expense');
    }
  };

  const columns: TableColumn<Expense>[] = [
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
      header: 'Category',
      accessor: 'category',
      sortable: true,
      render: (row) => <span className="text-slate-600">{row.category}</span>,
    },
    {
      header: 'Description',
      accessor: 'description',
      sortable: true,
      render: (row) => (
        <span className="font-medium text-slate-900" title={row.description}>
          {row.description || '—'}
        </span>
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
  ];

  const orderLabel = profitability
    ? quotationDisplayLabel(
        profitability.quotation_number,
        profitability.client_name,
        profitability.event_type,
      )
    : '';

  const totalOrderExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <Card
      title="Order Expenses"
      subtitle={`Order: ${orderLabel || `#${quotationId}`}`}
    >
      {loading ? (
        <LoadingState skeleton columns={5} skeletonRows={3} />
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card className="border-slate-200 bg-slate-50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Revenue Received
                  </p>
                  <p className="mt-1 text-2xl font-bold text-emerald-600">
                    {formatRupees(profitability?.revenue_received ?? 0)}
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <Wallet size={22} aria-hidden="true" />
                </div>
              </div>
            </Card>

            <Card className="border-slate-200 bg-slate-50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Order Expenses
                  </p>
                  <p className="mt-1 text-2xl font-bold text-indigo-600">
                    {formatRupees(profitability?.order_expenses ?? 0)}
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                  <FileText size={22} aria-hidden="true" />
                </div>
              </div>
            </Card>

            <Card className="border-slate-200 bg-slate-50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Current Profit
                  </p>
                  <p
                    className={`mt-1 text-2xl font-bold ${
                      profitColors(profitability?.profit ?? 0)
                    }`}
                  >
                    {formatRupees(profitability?.profit ?? 0)}
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                  <TrendingUp size={22} aria-hidden="true" />
                </div>
              </div>
            </Card>
          </div>

          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <div className="flex items-center gap-3">
              <p className="text-sm text-slate-600">
                <span className="font-semibold text-slate-900">
                  {expenses.length}
                </span>{' '}
                order expenses
              </p>
              <p className="text-sm text-slate-600">
                <span className="font-semibold text-indigo-700">
                  {formatRupees(totalOrderExpenses)}
                </span>{' '}
                total
              </p>
            </div>

            <Button
              leftIcon={<Plus size={18} aria-hidden="true" />}
              onClick={handleOpenAdd}
            >
              Add Expense
            </Button>
          </div>

          <Table
            columns={columns}
            data={expenses}
            rowKey={(row) => String(row.id)}
            emptyState={
              <EmptyState
                title="No order expenses yet"
                description="Add expenses linked to this order to track its spending."
                action={{
                  label: 'Add Expense',
                  onClick: handleOpenAdd,
                  leftIcon: <Plus size={18} aria-hidden="true" />,
                }}
              />
            }
          />

          <ExpenseModal
            open={modalOpen}
            title={editingExpense ? 'Edit Order Expense' : 'Add Order Expense'}
            confirmText={editingExpense ? 'Save Changes' : 'Add Expense'}
            presetType="Order Expense"
            presetQuotationId={quotationId}
            initial={editingExpense}
            onClose={() => {
              setModalOpen(false);
              setEditingExpense(null);
            }}
            onSaved={() => {
              setModalOpen(false);
              setEditingExpense(null);
              loadData();
            }}
          />
        </div>
      )}
    </Card>
  );
};

export default OrderExpensesSection;