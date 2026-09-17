import { useParams } from 'react-router-dom';
import {
  CheckCircle2,
  Clock,
  Plus,
  CreditCard,
  IndianRupee,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import StatusBadge from '../../../components/ui/StatusBadge';
import LoadingState from '../../../components/ui/LoadingState';
import BackNavigation from '../../../components/ui/BackNavigation';
import {
  toastSuccess,
  toastError,
  toastLoading,
  toastDismiss,
} from '../../../utils/toast';
import { clientService } from '../../../services/client.service';
import { paymentService } from '../../../services/payment.service';
import type { ClientDetails, ClientEvent } from '../types/client.types';
import type {
  Payment,
  QuotationPayments,
} from '../types/payment.types';
import PaymentStatusBadge from '../components/PaymentStatusBadge';
import PaymentModal from '../components/PaymentModal';
import PaymentHistory from '../components/PaymentHistory';

const ClientDetailsPage = () => {
  const { id } = useParams<{ id: string }>();

  const [data, setData] = useState<ClientDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const [paymentsByQuote, setPaymentsByQuote] = useState<
    Record<number, QuotationPayments>
  >({});
  const [expandedQuote, setExpandedQuote] = useState<number | null>(null);

  const [addModalQuote, setAddModalQuote] = useState<number | null>(null);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);

  useEffect(() => {
    if (id) loadDetails(Number(id));
  }, [id]);

  const loadDetails = async (clientId: number) => {
    try {
      setLoading(true);
      const details = await clientService.getClientDetails(clientId);
      setData(details);
    } catch (error) {
      console.error(error);
      toastError('Failed to load client details');
    } finally {
      setLoading(false);
    }
  };

  const loadPayments = async (quotationId: number) => {
    try {
      const qp = await paymentService.getPaymentsByQuotation(quotationId);
      setPaymentsByQuote((prev) => ({
        ...prev,
        [quotationId]: qp,
      }));
    } catch (error) {
      console.error(error);
      toastError('Failed to load payments');
    }
  };

  const handleToggleStatus = async (
    serviceId: number,
    currentStatus: string,
  ) => {
    const newStatus = currentStatus === 'Completed' ? 'Pending' : 'Completed';

    const toastId = toastLoading('Updating status...');

    try {
      setUpdatingId(serviceId);
      await clientService.updateServiceStatus(serviceId, newStatus);
      await loadDetails(Number(id));
      toastDismiss(toastId);
      toastSuccess('Status updated successfully');
    } catch (err) {
      console.error(err);
      toastDismiss(toastId);
      toastError('Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  };

  const toggleExpand = async (quotationId: number) => {
    if (expandedQuote === quotationId) {
      setExpandedQuote(null);
      return;
    }

    setExpandedQuote(quotationId);

    if (!paymentsByQuote[quotationId]) {
      await loadPayments(quotationId);
    }
  };

  const handlePaymentSaved = async (quotationId: number) => {
    await loadPayments(quotationId);
    await loadDetails(Number(id));
  };

  const handleDeletePayment = async (payment: Payment) => {
    if (
      !window.confirm(
        'Are you sure you want to delete this payment? This cannot be undone.',
      )
    ) {
      return;
    }

    const toastId = toastLoading('Deleting payment...');

    try {
      await paymentService.deletePayment(payment.id);
      await handlePaymentSaved(payment.quotation_id);
      toastDismiss(toastId);
      toastSuccess('Payment deleted');
    } catch (error) {
      console.error(error);
      toastDismiss(toastId);
      toastError('Failed to delete payment');
    }
  };

  if (loading) {
    return <LoadingState text="Loading client details..." />;
  }

  if (!data) {
    return (
      <Card>
        <p className="text-slate-500">Client not found.</p>
        <BackNavigation
          fallbackPath="/clients"
          label="Back to Clients"
          className="mt-4"
        />
      </Card>
    );
  }

  const { client, events, overall_status, financial } = data;

  const formatCurrency = (value: number) =>
    `₹${value.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;

  return (
    <div className="space-y-6">
      <BackNavigation
        fallbackPath="/clients"
        label="Back to Clients"
      />

      <Card>
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-2xl font-bold text-white">
              {client.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{client.name}</h1>
              <div className="mt-1 space-y-1 text-sm text-slate-500">
                {client.phone && <p>{client.phone}</p>}
                {client.email && <p>{client.email}</p>}
                {client.address && <p>{client.address}</p>}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-start gap-1 md:items-end">
            <span className="text-sm text-slate-500">Overall Delivery</span>
            <StatusBadge status={overall_status} />
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="!p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
              <IndianRupee size={20} aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Business</p>
              <p className="text-xl font-bold text-slate-900">
                {formatCurrency(financial.total_business)}
              </p>
            </div>
          </div>
        </Card>

        <Card className="!p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-600">
              <CheckCircle2 size={20} aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Amount Paid</p>
              <p className="text-xl font-bold text-green-700">
                {formatCurrency(financial.amount_paid)}
              </p>
            </div>
          </div>
        </Card>

        <Card className="!p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 text-red-600">
              <Clock size={20} aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Pending Amount</p>
              <p className="text-xl font-bold text-red-700">
                {formatCurrency(financial.pending_amount)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="!p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">Client Payment Status</span>
          </div>
          <PaymentStatusBadge status={financial.payment_status} />
        </div>
      </Card>

      {events.length === 0 ? (
        <Card>
          <p className="text-slate-500">
            No quotations/events yet. This client has no quotes, which is
            perfectly valid.
          </p>
        </Card>
      ) : (
        events.map((event) => (
          <ClientEventCard
            key={event.quotation_id}
            event={event}
            updatingId={updatingId}
            onToggleStatus={handleToggleStatus}
            expanded={expandedQuote === event.quotation_id}
            onToggleExpand={() => toggleExpand(event.quotation_id)}
            payments={paymentsByQuote[event.quotation_id]?.payments ?? []}
            onAddPayment={() => setAddModalQuote(event.quotation_id)}
            onEditPayment={(p) => setEditingPayment(p)}
            onDeletePayment={handleDeletePayment}
            formatCurrency={formatCurrency}
          />
        ))
      )}

      <PaymentModal
        open={addModalQuote !== null}
        quotationId={addModalQuote ?? 0}
        title="Add Payment"
        confirmText="Add Payment"
        onClose={() => setAddModalQuote(null)}
        onSaved={() => {
          if (addModalQuote !== null) {
            handlePaymentSaved(addModalQuote);
          }
        }}
      />

      <PaymentModal
        open={editingPayment !== null}
        quotationId={editingPayment?.quotation_id ?? 0}
        title="Edit Payment"
        confirmText="Save Changes"
        initial={
          editingPayment
            ? {
                id: editingPayment.id,
                amount: editingPayment.amount,
                payment_date: editingPayment.payment_date,
                payment_method: editingPayment.payment_method,
                notes: editingPayment.notes,
              }
            : undefined
        }
        onClose={() => setEditingPayment(null)}
        onSaved={() => {
          if (editingPayment !== null) {
            handlePaymentSaved(editingPayment.quotation_id);
          }
        }}
      />
    </div>
  );
};

interface ClientEventCardProps {
  event: ClientEvent;
  updatingId: number | null;
  onToggleStatus: (serviceId: number, currentStatus: string) => void;
  expanded: boolean;
  onToggleExpand: () => void;
  payments: Payment[];
  onAddPayment: () => void;
  onEditPayment: (payment: Payment) => void;
  onDeletePayment: (payment: Payment) => void;
  formatCurrency: (value: number) => string;
}

const ClientEventCard = ({
  event,
  updatingId,
  onToggleStatus,
  expanded,
  onToggleExpand,
  payments,
  onAddPayment,
  onEditPayment,
  onDeletePayment,
  formatCurrency,
}: ClientEventCardProps) => {
  return (
    <Card>
      <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-slate-900">
              {event.quotation_number}
            </h2>
            <StatusBadge status={event.overall_status} />
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {event.event_type && `${event.event_type} • `}
            {event.event_date || 'No date'}
            {event.event_time && ` • ${event.event_time}`}
          </p>
          {(event.venue || event.city) && (
            <p className="text-xs text-slate-400">
              {[event.venue, event.city].filter(Boolean).join(', ')}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <PaymentStatusBadge status={event.payment_status} />
          <Button variant="outline" onClick={onAddPayment}>
            <Plus size={16} aria-hidden="true" />
            Add Payment
          </Button>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-3 rounded-xl bg-slate-50 p-4">
        <div>
          <p className="text-xs text-slate-500">Total</p>
          <p className="text-base font-semibold text-slate-900">
            {formatCurrency(event.total)}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Paid</p>
          <p className="text-base font-semibold text-green-700">
            {formatCurrency(event.paid)}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Pending</p>
          <p className="text-base font-semibold text-red-700">
            {formatCurrency(event.pending)}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200">
        <table className="min-w-full" role="grid">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Service
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Qty
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Price
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Total
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Delivery
              </th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {event.services.map((service) => {
              const isUpdating = updatingId === service.id;
              const isCompleted = service.status === 'Completed';

              return (
                <tr key={service.id} className="border-t hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm font-medium text-slate-900">
                    {service.service_name}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">{service.quantity}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">
                    ₹{service.price.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">
                    ₹{service.total.toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={service.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant={isCompleted ? 'secondary' : 'primary'}
                      loading={isUpdating}
                      onClick={() => onToggleStatus(service.id, service.status)}
                      aria-label={
                        isCompleted
                          ? `Mark ${service.service_name} as pending`
                          : `Mark ${service.service_name} as completed`
                      }
                    >
                      {isCompleted ? (
                        <Clock size={16} aria-hidden="true" />
                      ) : (
                        <CheckCircle2 size={16} aria-hidden="true" />
                      )}
                      {isCompleted ? 'Mark Pending' : 'Mark Completed'}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4">
        <button
          type="button"
          onClick={onToggleExpand}
          className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-blue-600 transition hover:bg-blue-50"
        >
          <CreditCard size={16} aria-hidden="true" />
          {expanded ? 'Hide Payment History' : 'View Payment History'}
        </button>

        {expanded && (
          <div className="mt-3">
            <PaymentHistory
              payments={payments}
              onEdit={onEditPayment}
              onDelete={onDeletePayment}
            />
          </div>
        )}
      </div>
    </Card>
  );
};

export default ClientDetailsPage;