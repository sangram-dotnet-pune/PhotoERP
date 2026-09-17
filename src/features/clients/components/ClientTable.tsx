import { Eye, Pencil, Trash2 } from 'lucide-react';

import Button from '../../../components/ui/Button';
import Table, {
  TableColumn,
} from '../../../components/ui/Table';
import StatusBadge from '../../../components/ui/StatusBadge';

import type { ClientListItem } from '../types/client.types';

interface ClientTableProps {
  clients: ClientListItem[];
  onView?: (id: number) => void;
  onEdit?: (client: ClientListItem) => void;
  onDelete?: (client: ClientListItem) => void;
}

const ClientTable = ({
  clients,
  onView,
  onEdit,
  onDelete,
}: ClientTableProps) => {
  const columns: TableColumn<ClientListItem>[] = [
    {
      header: 'Client',
      accessor: 'name',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
            {row.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-medium text-slate-900">
              {row.name}
            </p>
            {row.email && (
              <p className="text-xs text-slate-500">
                {row.email}
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      header: 'Phone',
      accessor: 'phone',
      render: (row) => row.phone || '-',
    },
    {
      header: 'Events',
      accessor: 'event_count',
    },
    {
      header: 'Delivery Status',
      accessor: 'overall_status',
      render: (row) => (
        <StatusBadge status={row.overall_status} />
      ),
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
            onClick={() => onEdit?.(row)}
          >
            <Pencil size={16} />
          </Button>

          <Button
            variant="danger"
            onClick={() => onDelete?.(row)}
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
      data={clients}
      emptyMessage="No clients found."
    />
  );
};

export default ClientTable;