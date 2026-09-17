import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import Table, { TableColumn } from '../../../components/ui/Table';
import BackNavigation from '../../../components/ui/BackNavigation';
import LoadingState from '../../../components/ui/LoadingState';
import PaymentStatusBadge from '../../clients/components/PaymentStatusBadge';

import { reportsService } from '../../../services/reports.service';
import { quotationService } from '../../../services/quotation.service';

import type {
  PendingClient,
  ReportsSummary,
} from '../types/reports.types';
import type { QuotationListItem } from '../../quotations/types/quotationList.types';

import { ROUTES } from '../../../constants/routes';
import { toastError } from '../../../utils/toast';

const currency = (value: number) => `₹${value.toLocaleString()}`;

const PendingPaymentsPage = () => {
  const [summary, setSummary] = useState<ReportsSummary>();
  const [pendingQuotations, setPendingQuotations] = useState<
    QuotationListItem[]
  >([]);
  const [pendingClients, setPendingClients] = useState<PendingClient[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [summaryData, quotationData, clientData] = await Promise.all([
        reportsService.getReportsSummary(),
        quotationService.getPendingQuotations(),
        reportsService.getPendingClients(),
      ]);

      setSummary(summaryData);
      setPendingQuotations(quotationData);
      setPendingClients(clientData);
    } catch (err) {
      console.error(err);

      setError('Failed to load pending payments. Please try again.');
      toastError('Failed to load pending payments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const quotationColumns: TableColumn<QuotationListItem>[] = [
    {
      header: 'Quotation',
      accessor: 'quotation_number',
      sortable: true,
      render: (row) => (
        <Link
          to={`${ROUTES.QUOTATIONS}/${row.id}`}
          className="font-medium text-blue-600 hover:text-blue-800"
        >
          {row.quotation_number}
        </Link>
      ),
    },
    {
      header: 'Client',
      accessor: 'client_name',
      sortable: true,
    },
    {
      header: 'Event',
      accessor: 'event_type',
      sortable: true,
    },
    {
      header: 'Event Date',
      accessor: 'event_date',
      sortable: true,
      render: (row) => row.event_date || '—',
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
      header: 'Pending',
      accessor: 'balance',
      sortable: true,
      render: (row) => (
        <span className="font-semibold text-orange-600">
          {currency(row.balance)}
        </span>
      ),
      cellClassName: 'text-right',
    },
    {
      header: 'Payment Status',
      accessor: 'status',
      sortable: true,
      render: (row) => <PaymentStatusBadge status={row.status} />,
    },
  ];

  const clientColumns: TableColumn<PendingClient>[] = [
    {
      header: 'Client',
      accessor: 'client_name',
      sortable: true,
      render: (row) => (
        <Link
          to={`${ROUTES.CLIENTS}/${row.client_id}`}
          className="font-medium text-blue-600 hover:text-blue-800"
        >
          {row.client_name}
        </Link>
      ),
    },
    {
      header: 'Total Business',
      accessor: 'total_business',
      sortable: true,
      render: (row) => currency(row.total_business),
      cellClassName: 'text-right',
    },
    {
      header: 'Total Paid',
      accessor: 'amount_paid',
      sortable: true,
      render: (row) => currency(row.amount_paid),
      cellClassName: 'text-right',
    },
    {
      header: 'Total Pending',
      accessor: 'pending_amount',
      sortable: true,
      render: (row) => (
        <span className="font-semibold text-orange-600">
          {currency(row.pending_amount)}
        </span>
      ),
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

            <Button onClick={loadData}>Retry</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <BackNavigation fallbackPath="/reports" label="Back to Reports" />

      <div>
        <h1 className="text-3xl font-bold">Pending Payments</h1>

        <p className="mt-1 text-slate-500">
          Outstanding balances derived live from recorded payments
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-sm text-slate-500">Total Pending</p>
          <p className="mt-2 text-3xl font-bold text-orange-600">
            {currency(summary?.total_pending ?? 0)}
          </p>
        </Card>

        <Card>
          <p className="text-sm text-slate-500">Quotations with Pending</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {pendingQuotations.length}
          </p>
        </Card>

        <Card>
          <p className="text-sm text-slate-500">Clients with Pending</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {pendingClients.length}
          </p>
        </Card>
      </div>

      <Card title="Pending Quotations">
        {loading ? (
          <LoadingState text="Loading pending quotations..." />
        ) : (
          <Table
            columns={quotationColumns}
            data={pendingQuotations}
            emptyMessage="No outstanding payments."
          />
        )}
      </Card>

      <Card title="Client Summary">
        {loading ? (
          <LoadingState text="Loading client summary..." />
        ) : (
          <Table
            columns={clientColumns}
            data={pendingClients}
            emptyMessage="No outstanding payments."
          />
        )}
      </Card>
    </div>
  );
};

export default PendingPaymentsPage;