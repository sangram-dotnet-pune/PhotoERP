import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Users, Search } from 'lucide-react';
import { confirm } from '@tauri-apps/plugin-dialog';

import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import Input from '../../../components/ui/Input';
import Modal from '../../../components/ui/Modal';
import Table, { TableColumn } from '../../../components/ui/Table';
import { EmptyStatePresets } from '../../../components/ui/EmptyState';
import LoadingState from '../../../components/ui/LoadingState';
import {
  toastSuccess,
  toastError,
  toastLoading,
  toastDismiss,
} from '../../../utils/toast';
import { clientService } from '../../../services/client.service';
import type { ClientInfo, ClientListItem } from '../types/client.types';
import { ROUTES } from '../../../constants/routes';

const ClientsPage = () => {
  const navigate = useNavigate();

  const [clients, setClients] = useState<ClientListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [editingClient, setEditingClient] = useState<ClientListItem | null>(null);

  const [editForm, setEditForm] = useState<ClientInfo>({
    id: 0,
    name: '',
    phone: '',
    email: '',
    address: '',
  });

  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    return clients.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.phone.toLowerCase().includes(search.toLowerCase()) ||
        c.email.toLowerCase().includes(search.toLowerCase());

      const matchesStatus = !statusFilter || c.overall_status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [clients, search, statusFilter]);

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      setLoading(true);
      const data = await clientService.getClients();
      setClients(data);
    } catch (error) {
      console.error(error);
      toastError('Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  const handleView = (id: number) => {
    navigate(`/clients/${id}`);
  };

  const handleEdit = (client: ClientListItem) => {
    setEditForm({
      id: client.id,
      name: client.name,
      phone: client.phone,
      email: client.email,
      address: '',
    });

    setEditingClient(client);
  };

  const handleSaveEdit = async () => {
    if (!editForm.name.trim()) {
      toastError('Client name is required');
      return;
    }

    const toastId = toastLoading('Updating client...');

    try {
      setSaving(true);
      await clientService.updateClient(editForm);

      toastDismiss(toastId);
      toastSuccess('Client updated successfully');

      setEditingClient(null);
      await loadClients();
    } catch (error) {
      console.error(error);

      toastDismiss(toastId);
      toastError('Failed to update client');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (client: ClientListItem) => {
    const confirmed = await confirm(
      `Delete client "${client.name}"?\n\nClients with quotations cannot be deleted.`,
      {
        title: 'Delete Client',
        kind: 'warning',
        okLabel: 'Delete',
        cancelLabel: 'Cancel',
      },
    );

    if (!confirmed) return;

    const toastId = toastLoading('Deleting client...');

    try {
      await clientService.deleteClient(client.id);

      toastDismiss(toastId);
      toastSuccess('Client deleted successfully');

      await loadClients();
    } catch (error) {
      console.error(error);

      toastDismiss(toastId);
      toastError(
        typeof error === 'string'
          ? error
          : 'Failed to delete client',
      );
    }
  };

  const columns: TableColumn<ClientListItem>[] = useMemo(
    () => [
      {
        header: 'Client',
        accessor: 'name',
        sortable: true,
        render: (row) => (
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
              {row.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-medium text-slate-900">{row.name}</p>
              {row.email && (
                <p className="text-xs text-slate-500">{row.email}</p>
              )}
            </div>
          </div>
        ),
      },
      {
        header: 'Phone',
        accessor: 'phone',
        sortable: true,
        render: (row) => row.phone || '—',
      },
      {
        header: 'Events',
        accessor: 'event_count',
        sortable: true,
        cellClassName: 'text-center',
      },
      {
        header: 'Delivery Status',
        accessor: 'overall_status',
        sortable: true,
        render: (row) => {
          const colors: Record<string, string> = {
            Completed: 'bg-green-100 text-green-700',
            Pending: 'bg-yellow-100 text-yellow-700',
          };
          return (
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                colors[row.overall_status] || 'bg-blue-100 text-blue-700'
              }`}
            >
              {row.overall_status}
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
              aria-label={`View client ${row.name}`}
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
              onClick={() => handleEdit(row)}
              aria-label={`Edit client ${row.name}`}
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
              onClick={() => handleDelete(row)}
              aria-label={`Delete client ${row.name}`}
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

  if (loading) {
    return (
      <div className="space-y-6">
        <LoadingState skeleton columns={columns.length} skeletonRows={5} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users size={28} className="text-blue-600" aria-hidden="true" />
            Clients
          </h1>
          <p className="text-slate-500">
            Manage all your clients and their event deliveries
          </p>
        </div>
      </div>

      <Card>
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search
              className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <Input
              placeholder="Search clients by name, phone, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
              aria-label="Search clients"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full md:w-48 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            aria-label="Filter by delivery status"
          >
            <option value="">All Delivery Status</option>
            <option value="Completed">Completed</option>
            <option value="Pending">Pending</option>
          </select>
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
            ? EmptyStatePresets.noClients(() => navigate(ROUTES.NEW_QUOTATION))
            : undefined
        }
      />

      <Modal
        open={editingClient !== null}
        title="Edit Client"
        onClose={() => setEditingClient(null)}
        onConfirm={handleSaveEdit}
        confirmText="Save Changes"
        loading={saving}
      >
        <div className="space-y-4">
          <Input
            label="Name"
            value={editForm.name}
            onChange={(e) =>
              setEditForm((prev) => ({ ...prev, name: e.target.value }))
            }
            required
            aria-required="true"
          />

          <Input
            label="Phone"
            type="tel"
            value={editForm.phone}
            onChange={(e) =>
              setEditForm((prev) => ({ ...prev, phone: e.target.value }))
            }
            required
            aria-required="true"
            placeholder="10-digit mobile number"
          />

          <Input
            label="Email"
            type="email"
            value={editForm.email}
            onChange={(e) =>
              setEditForm((prev) => ({ ...prev, email: e.target.value }))
            }
            placeholder="example@email.com"
          />

          <Input
            label="Address"
            value={editForm.address}
            onChange={(e) =>
              setEditForm((prev) => ({ ...prev, address: e.target.value }))
            }
            placeholder="Client address"
          />
        </div>
      </Modal>
    </div>
  );
};

export default ClientsPage;