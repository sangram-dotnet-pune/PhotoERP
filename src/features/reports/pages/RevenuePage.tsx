import { useEffect, useState } from 'react';

import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import Input from '../../../components/ui/Input';
import Table, { TableColumn } from '../../../components/ui/Table';
import BackNavigation from '../../../components/ui/BackNavigation';
import { EmptyStatePresets } from '../../../components/ui/EmptyState';
import LoadingState from '../../../components/ui/LoadingState';

import { reportsService } from '../../../services/reports.service';
import { dashboardService } from '../../../services/dashboard.service';
import { quotationService } from '../../../services/quotation.service';

import type {
  PaymentRecord,
  ReportsSummary,
} from '../types/reports.types';
import type { RevenueSummary } from '../../dashboard/types/dashboard.types';
import type { QuotationListItem } from '../../quotations/types/quotationList.types';

import { toastError } from '../../../utils/toast';

const currency = (value: number) => `₹${value.toLocaleString()}`;

const RevenuePage = () => {
  const [summary, setSummary] = useState<ReportsSummary>();
  const [revenue, setRevenue] = useState<RevenueSummary[]>([]);
  const [quotations, setQuotations] = useState<QuotationListItem[]>([]);

  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const [loading, setLoading] = useState(true);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOverview = async () => {
    try {
      setLoading(true);
      setError(null);

      const [summaryData, revenueData, quotationData] = await Promise.all([
        reportsService.getReportsSummary(),
        dashboardService.getMonthlyRevenue(),
        quotationService.getQuotations(),
      ]);

      setSummary(summaryData);
      setRevenue(revenueData);
      setQuotations(quotationData);
    } catch (err) {
      console.error(err);

      setError('Failed to load revenue data. Please try again.');
      toastError('Failed to load revenue data');
    } finally {
      setLoading(false);
    }
  };

  const loadPayments = async () => {
    try {
      setPaymentsLoading(true);

      const data = await reportsService.getAllPayments(from, to);

      setPayments(data);
    } catch (err) {
      console.error(err);

      toastError('Failed to load payments');
    } finally {
      setPaymentsLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, []);

  useEffect(() => {
    loadPayments();
  }, [from, to]);

  const paymentColumns: TableColumn<PaymentRecord>[] = [
    {
      header: 'Date',
      accessor: 'payment_date',
      sortable: true,
      render: (row) => row.payment_date || '—',
    },
    {
      header: 'Client',
      accessor: 'client_name',
      sortable: true,
    },
    {
      header: 'Quotation',
      accessor: 'quotation_number',
      sortable: true,
    },
    {
      header: 'Amount',
      accessor: 'amount',
      sortable: true,
      render: (row) => currency(row.amount),
      cellClassName: 'font-semibold text-right',
    },
    {
      header: 'Method',
      accessor: 'payment_method',
      sortable: true,
    },
    {
      header: 'Notes',
      accessor: 'notes',
      render: (row) => row.notes || '—',
    },
  ];

  const quotationColumns: TableColumn<QuotationListItem>[] = [
    {
      header: 'Quotation',
      accessor: 'quotation_number',
      sortable: true,
    },
    {
      header: 'Client',
      accessor: 'client_name',
      sortable: true,
    },
    {
      header: 'Total',
      accessor: 'total',
      sortable: true,
      render: (row) => currency(row.total),
      cellClassName: 'text-right',
    },
    {
      header: 'Paid',
      accessor: 'paid',
      sortable: true,
      render: (row) => currency(row.paid),
      cellClassName: 'text-right',
    },
    {
      header: 'Balance',
      accessor: 'balance',
      sortable: true,
      render: (row) => currency(row.balance),
      cellClassName: 'text-right',
    },
  ];

  if (error) {
    return (
      <div className="space-y-6">
        <BackNavigation fallbackPath="/reports" label="Back to Reports" />

        <Card>
          <div className="flex flex-col items-center gap-4 py-10 text-center">
            <p className="text-red-600">{error}</p>

            <Button onClick={loadOverview}>Retry</Button>
          </div>
        </Card>
      </div>
    );
  }

  const maxRevenue = Math.max(...revenue.map((r) => r.amount), 1);

  return (
    <div className="space-y-6">
      <BackNavigation fallbackPath="/reports" label="Back to Reports" />

      <div>
        <h1 className="text-3xl font-bold">Revenue</h1>

        <p className="mt-1 text-slate-500">
          Revenue is money actually received. Unpaid quotation totals are
          never counted as revenue.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <p className="text-sm text-slate-500">Total Revenue</p>
          <p className="mt-2 text-3xl font-bold text-green-600">
            {currency(summary?.total_revenue ?? 0)}
          </p>
          <p className="mt-1 text-xs text-slate-400">Payments received</p>
        </Card>

        <Card>
          <p className="text-sm text-slate-500">Total Quotation Value</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {currency(summary?.total_quotation_value ?? 0)}
          </p>
          <p className="mt-1 text-xs text-slate-400">All quotations</p>
        </Card>

        <Card>
          <p className="text-sm text-slate-500">Total Pending</p>
          <p className="mt-2 text-3xl font-bold text-orange-600">
            {currency(summary?.total_pending ?? 0)}
          </p>
          <p className="mt-1 text-xs text-slate-400">Still to be collected</p>
        </Card>

        <Card>
          <p className="text-sm text-slate-500">Quotations with Payments</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {summary?.quotations_with_payments ?? 0}
          </p>
          <p className="mt-1 text-xs text-slate-400">Contributing to revenue</p>
        </Card>
      </div>

      <Card title="Revenue Breakdown by Month">
        {loading ? (
          <LoadingState text="Loading revenue data..." />
        ) : revenue.length === 0 ? (
          EmptyStatePresets.noPayments()
        ) : (
          <div className="space-y-4">
            {revenue.map((item) => (
              <div key={item.month}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700">{item.month}</span>
                  <span className="font-semibold text-slate-900">
                    {currency(item.amount)}
                  </span>
                </div>

                <div className="h-2 w-full rounded-full bg-slate-100">
                  <div
                    className="h-2 rounded-full bg-blue-500"
                    style={{
                      width: `${Math.max(
                        (item.amount / maxRevenue) * 100,
                        2,
                      )}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="Recent Payments">
        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Input
            label="From"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />

          <Input
            label="To"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />

          {(from || to) && (
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setFrom('');
                  setTo('');
                }}
              >
                Clear Filter
              </Button>
            </div>
          )}
        </div>

        {paymentsLoading ? (
          <LoadingState text="Loading payments..." />
        ) : (
          <Table
            columns={paymentColumns}
            data={payments}
            emptyMessage="No payments recorded yet."
          />
        )}
      </Card>

      <Card title="Revenue by Quotation">
        <Table
          columns={quotationColumns}
          data={quotations}
          emptyMessage="No quotations found."
        />
      </Card>
    </div>
  );
};

export default RevenuePage;