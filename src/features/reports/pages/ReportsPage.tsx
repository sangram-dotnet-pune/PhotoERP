import { useEffect, useState } from 'react';

import Card from '../../../components/ui/Card';
import Table, { TableColumn } from '../../../components/ui/Table';
import BackNavigation from '../../../components/ui/BackNavigation';
import { EmptyStatePresets } from '../../../components/ui/EmptyState';
import LoadingState from '../../../components/ui/LoadingState';

import { reportsService } from '../../../services/reports.service';
import { dashboardService } from '../../../services/dashboard.service';
import { ReportsSummary, TopClient } from '../types/reports.types';
import { RevenueSummary } from '../../dashboard/types/dashboard.types';
import { toastError } from '../../../utils/toast';

const STATUS_COLORS: Record<string, string> = {
  Draft: 'bg-slate-100 text-slate-700',
  Sent: 'bg-blue-100 text-blue-700',
  Confirmed: 'bg-indigo-100 text-indigo-700',
  Completed: 'bg-green-100 text-green-700',
  Cancelled: 'bg-red-100 text-red-700',
  Paid: 'bg-green-100 text-green-700',
  Partial: 'bg-yellow-100 text-yellow-700',
  Pending: 'bg-red-100 text-red-700',
};

const StatusBadge = ({ status }: { status: string }) => (
  <span
    className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
      STATUS_COLORS[status] || 'bg-slate-100 text-slate-700'
    }`}
  >
    {status}
  </span>
);

const ReportsPage = () => {
  const [summary, setSummary] = useState<ReportsSummary>();
  const [topClients, setTopClients] = useState<TopClient[]>([]);
  const [revenue, setRevenue] = useState<RevenueSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      const [summaryData, clientsData, revenueData] = await Promise.all([
        reportsService.getReportsSummary(),
        reportsService.getTopClients(10),
        dashboardService.getMonthlyRevenue(),
      ]);

      setSummary(summaryData);
      setTopClients(clientsData);
      setRevenue(revenueData);
    } catch (error) {
      console.error(error);

      toastError('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const clientColumns: TableColumn<TopClient>[] = [
    {
      header: 'Client',
      accessor: 'client_name',
      sortable: true,
    },
    {
      header: 'Events',
      accessor: 'event_count',
      sortable: true,
      cellClassName: 'text-center',
    },
    {
      header: 'Total Business',
      accessor: 'total_business',
      sortable: true,
      render: (row) => `₹${row.total_business.toLocaleString()}`,
      cellClassName: 'text-right',
    },
    {
      header: 'Amount Paid',
      accessor: 'amount_paid',
      sortable: true,
      render: (row) => `₹${row.amount_paid.toLocaleString()}`,
      cellClassName: 'text-right',
    },
    {
      header: 'Pending',
      accessor: 'pending_amount',
      sortable: true,
      render: (row) => `₹${row.pending_amount.toLocaleString()}`,
      cellClassName: 'text-right',
    },
    {
      header: 'Status',
      accessor: 'payment_status',
      sortable: true,
      render: (row) => <StatusBadge status={row.payment_status} />,
    },
  ];

  if (loading) {
    return <LoadingState text="Loading reports..." />;
  }

  const maxRevenue = Math.max(...revenue.map((r) => r.amount), 1);

  return (
    <div className="space-y-6">
      <BackNavigation fallbackPath="/" label="Back to Dashboard" />

      <div>
        <h1 className="text-3xl font-bold">Reports</h1>

        <p className="text-slate-500">
          Business overview across quotations, payments and clients
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-sm text-slate-500">Total Quotations</p>
          <p className="mt-2 text-3xl font-bold">
            {summary?.total_quotations ?? 0}
          </p>
        </Card>

        <Card>
          <p className="text-sm text-slate-500">Total Revenue Collected</p>
          <p className="mt-2 text-3xl font-bold text-green-600">
            ₹{(summary?.total_revenue ?? 0).toLocaleString()}
          </p>
        </Card>

        <Card>
          <p className="text-sm text-slate-500">Outstanding Balance</p>
          <p className="mt-2 text-3xl font-bold text-red-600">
            ₹{(summary?.total_pending ?? 0).toLocaleString()}
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title="Quotation Workflow Status">
          {summary && summary.workflow_summary.length > 0 ? (
            <div className="space-y-4">
              {summary.workflow_summary.map((item) => (
                <div key={item.status} className="flex items-center justify-between">
                  <StatusBadge status={item.status} />
                  <span className="text-lg font-semibold">{item.count}</span>
                </div>
              ))}
            </div>
          ) : (
            EmptyStatePresets.noData(
              'No quotations yet',
              'Create your first quotation to see workflow status.'
            )
          )}
        </Card>

        <Card title="Payment Status Overview">
          {summary && summary.payment_summary.length > 0 ? (
            <div className="space-y-4">
              {summary.payment_summary.map((item) => (
                <div key={item.status} className="flex items-center justify-between">
                  <StatusBadge status={item.status} />
                  <span className="text-lg font-semibold">{item.count}</span>
                </div>
              ))}
            </div>
          ) : (
            EmptyStatePresets.noPayments()
          )}
        </Card>
      </div>

      <Card title="Monthly Revenue (Payments Received)">
        {revenue.length === 0 ? (
          EmptyStatePresets.noPayments()
        ) : (
          <div className="flex h-48 items-end gap-3 overflow-x-auto">
            {revenue.map((item) => (
              <div
                key={item.month}
                className="flex min-w-12 flex-1 flex-col items-center gap-2"
              >
                <span className="text-xs font-semibold text-slate-600">
                  ₹{Math.round(item.amount).toLocaleString()}
                </span>

                <div
                  className="w-full rounded-t-md bg-blue-500"
                  style={{
                    height: `${Math.max(
                      (item.amount / maxRevenue) * 100,
                      4,
                    )}%`,
                  }}
                />
                <span className="text-sm text-slate-500">{item.month}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="Top Clients by Business">
        <Table
          columns={clientColumns}
          data={topClients}
          emptyMessage="No clients found."
        />
      </Card>
    </div>
  );
};

export default ReportsPage;