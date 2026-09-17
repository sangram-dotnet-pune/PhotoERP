import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter } from 'lucide-react';

import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import Input from '../../../components/ui/Input';
import Table, { TableColumn } from '../../../components/ui/Table';
import BackNavigation from '../../../components/ui/BackNavigation';
import { EmptyStatePresets } from '../../../components/ui/EmptyState';
import LoadingState from '../../../components/ui/LoadingState';
import { confirm } from '@tauri-apps/plugin-dialog';
import {
  toastSuccess,
  toastError,
  toastLoading,
  toastDismiss,
} from '../../../utils/toast';
import { ROUTES } from '../../../constants/routes';
import { QuotationListItem } from '../types/quotationList.types';
import { quotationService } from '../../../services/quotation.service';
import { reportsService } from '../../../services/reports.service';
import type { ReportsSummary } from '../../reports/types/reports.types';

const currency = (value: number) => `₹${value.toLocaleString()}`;

const paymentStatusOptions = ['Paid', 'Partial', 'Pending'] as const;
const workflowStatusOptions = [
  'Draft',
  'Sent',
  'Confirmed',
  'Completed',
  'Cancelled',
] as const;

const QuotationListPage = () => {
  const navigate = useNavigate();

  const [quotations, setQuotations] = useState<QuotationListItem[]>([]);
  const [summary, setSummary] = useState<ReportsSummary>();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [workflowFilter, setWorkflowFilter] = useState('');

  const filtered = useMemo(() => {
    return quotations.filter((q) => {
      const matchesSearch =
        q.client_name.toLowerCase().includes(search.toLowerCase()) ||
        q.quotation_number.toLowerCase().includes(search.toLowerCase()) ||
        q.event_type.toLowerCase().includes(search.toLowerCase());

      const matchesPayment = !paymentFilter || q.status === paymentFilter;
      const matchesWorkflow = !workflowFilter || q.workflow_status === workflowFilter;

      return matchesSearch && matchesPayment && matchesWorkflow;
    });
  }, [quotations, search, paymentFilter, workflowFilter]);

  useEffect(() => {
    loadQuotations();
  }, []);

  const loadQuotations = async () => {
    try {
      setLoading(true);

      const [data, summaryData] = await Promise.all([
        quotationService.getQuotations(),
        reportsService.getReportsSummary(),
      ]);

      setQuotations(data);
      setSummary(summaryData);
    } catch (error) {
      console.error(error);

      toastError('Failed to load quotations');
    } finally {
      setLoading(false);
    }
  };

  const handleView = (id: number) => {
    navigate(`/quotations/${id}`);
  };

  const handleEdit = (id: number) => {
    navigate(`/quotations/edit/${id}`);
  };

  const handleDelete = async (id: number) => {
    const confirmed = await confirm('Delete this quotation?');

    if (!confirmed) return;

    const toastId = toastLoading('Deleting quotation...');

    try {
      await quotationService.deleteQuotation(id);

      await loadQuotations();

      toastDismiss(toastId);

      toastSuccess('Quotation deleted successfully');
    } catch (err) {
      console.error(err);

      toastDismiss(toastId);

      toastError('Failed to delete quotation');
    }
  };

  const columns: TableColumn<QuotationListItem>[] = useMemo(
    () => [
      {
        header: 'Quotation No',
        accessor: 'quotation_number',
        sortable: true,
      },
      {
        header: 'Client',
        accessor: 'client_name',
        sortable: true,
        render: (row) => (
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-900">{row.client_name}</span>
            {row.venue && (
              <span className="text-xs text-slate-400">
                {row.venue}{row.city && `, ${row.city}`}
              </span>
            )}
          </div>
        ),
      },
      {
        header: 'Event',
        accessor: 'event_type',
        sortable: true,
      },
      {
        header: 'Date',
        accessor: 'event_date',
        sortable: true,
        render: (row) => row.event_date || '—',
      },
      {
        header: 'Total',
        accessor: 'total',
        sortable: true,
        render: (row) => currency(row.total),
        cellClassName: 'font-semibold text-right',
      },
      {
        header: 'Balance',
        accessor: 'balance',
        sortable: true,
        render: (row) => (
          <span
            className={
              row.balance > 0
                ? 'font-semibold text-orange-600'
                : 'font-semibold text-green-600'
            }
          >
            {currency(row.balance)}
          </span>
        ),
        cellClassName: 'text-right',
      },
      {
        header: 'Payment',
        accessor: 'status',
        sortable: true,
        render: (row) => {
          const colors: Record<string, string> = {
            Paid: 'bg-green-100 text-green-700',
            Partial: 'bg-yellow-100 text-yellow-700',
            Pending: 'bg-red-100 text-red-700',
          };
          return (
            <span
              className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                colors[row.status] || 'bg-slate-100 text-slate-700'
              }`}
            >
              {row.status}
            </span>
          );
        },
      },
      {
        header: 'Workflow',
        accessor: 'workflow_status',
        sortable: true,
        render: (row) => {
          const colors: Record<string, string> = {
            Draft: 'bg-slate-100 text-slate-700',
            Sent: 'bg-blue-100 text-blue-700',
            Confirmed: 'bg-indigo-100 text-indigo-700',
            Completed: 'bg-green-100 text-green-700',
            Cancelled: 'bg-red-100 text-red-700',
          };
          return (
            <span
              className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                colors[row.workflow_status] || 'bg-slate-100 text-slate-700'
              }`}
            >
              {row.workflow_status}
            </span>
          );
        },
      },
      {
        header: 'Actions',
        render: (row) => (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => handleView(row.id)}
              aria-label={`View quotation ${row.quotation_number}`}
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleEdit(row.id)}
              aria-label={`Edit quotation ${row.quotation_number}`}
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </Button>
            <Button
              variant="danger"
              onClick={() => handleDelete(row.id)}
              aria-label={`Delete quotation ${row.quotation_number}`}
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </Button>
          </div>
        ),
      },
    ],
    []
  );

  const hasFilters = paymentFilter || workflowFilter;

  if (loading) {
    return (
      <div className="space-y-6">
        <LoadingState skeleton columns={columns.length} skeletonRows={5} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <BackNavigation fallbackPath={ROUTES.DASHBOARD} label="Back to Dashboard" />

      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-bold">Quotations</h1>
          <p className="text-slate-500">Manage all quotations</p>
        </div>

        <Button
          leftIcon={<Plus size={18} />}
          onClick={() => navigate(ROUTES.NEW_QUOTATION)}
        >
          New Quotation
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <p className="text-sm text-slate-500">Total Quotations</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {summary?.total_quotations ?? 0}
          </p>
        </Card>

        <Card>
          <p className="text-sm text-slate-500">Quotation Value</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {currency(summary?.total_quotation_value ?? 0)}
          </p>
        </Card>

        <Card>
          <p className="text-sm text-slate-500">Received</p>
          <p className="mt-2 text-2xl font-bold text-green-600">
            {currency(summary?.total_revenue ?? 0)}
          </p>
        </Card>

        <Card>
          <p className="text-sm text-slate-500">Pending</p>
          <p className="mt-2 text-2xl font-bold text-orange-600">
            {currency(summary?.total_pending ?? 0)}
          </p>
        </Card>
      </div>

      <Card>
        <div className="space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1">
              <Search
                className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <Input
                placeholder="Search by client, quotation no, event, venue..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
                aria-label="Search quotations"
              />
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="w-full md:w-48 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                aria-label="Filter by payment status"
              >
                <option value="">All Payment Status</option>
                {paymentStatusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>

              <select
                value={workflowFilter}
                onChange={(e) => setWorkflowFilter(e.target.value)}
                className="w-full md:w-48 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                aria-label="Filter by workflow status"
              >
                <option value="">All Workflow Status</option>
                {workflowStatusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>

              {hasFilters && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setPaymentFilter('');
                    setWorkflowFilter('');
                  }}
                  leftIcon={<Filter size={16} />}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>

      <Table
        columns={columns}
        data={filtered}
        loading={loading}
        emptyState={
          filtered.length === 0 && search
            ? EmptyStatePresets.noSearchResults()
            : filtered.length === 0 && !search
            ? EmptyStatePresets.noQuotations(() =>
                navigate(ROUTES.NEW_QUOTATION)
              )
            : undefined
        }
      />
    </div>
  );
};

export default QuotationListPage;