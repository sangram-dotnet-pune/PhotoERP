import {
  Eye,
  Pencil,
  Trash2,
} from 'lucide-react';

import Button from '../../../components/ui/Button';
import Table, {
  TableColumn,
} from '../../../components/ui/Table';
import WorkflowBadge from '../../../components/ui/WorkflowBadge';

import type { QuotationListItem } from '../types/quotationList.types';

interface QuotationTableProps {
  quotations: QuotationListItem[];
  loading?: boolean;

  onView?: (id: number) => void;
  onEdit?: (id: number) => void;
  onDelete?: (id: number) => void;
}

const PaymentBadge = ({ status }: { status: string }) => (
  <span
    className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
      status === 'Paid'
        ? 'bg-green-100 text-green-700'
        : status === 'Partial'
        ? 'bg-yellow-100 text-yellow-700'
        : 'bg-red-100 text-red-700'
    }`}
  >
    {status}
  </span>
);

const QuotationTable = ({
  quotations,
  onView,
  onDelete,
  onEdit,
}: QuotationTableProps) => {
  const columns: TableColumn<QuotationListItem>[] = [
    {
      header: 'Quotation No',
      accessor: 'quotation_number',
    },
    {
      header: 'Client',
      accessor: 'client_name',
    },
    {
      header: 'Event',
      accessor: 'event_type',
    },
    {
      header: 'Date',
      accessor: 'event_date',
    },
    {
      header: 'Total',
      accessor: 'total',
      render: (row) =>
        `₹${row.total.toLocaleString()}`,
    },
    {
      header: 'Balance',
      accessor: 'balance',
      render: (row) =>
        `₹${row.balance.toLocaleString()}`,
    },
    {
      header: 'Payment',
      accessor: 'status',
      render: (row) => <PaymentBadge status={row.status} />,
    },
    {
      header: 'Workflow',
      accessor: 'workflow_status',
      render: (row) => <WorkflowBadge status={row.workflow_status} />,
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (row) => (
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => onView?.(row.id)}
          >
            <Eye size={16} />
          </Button>

          <Button
            variant="secondary"
            onClick={() => onEdit?.(row.id)}
          >
            <Pencil size={16} />
          </Button>

          <Button
            variant="danger"
            onClick={() => onDelete?.(row.id)}
          >
            <Trash2 size={16} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <Table
      columns={columns}
      data={quotations}
    />
  );
};

export default QuotationTable;