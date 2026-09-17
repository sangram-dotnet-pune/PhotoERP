import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, MapPin } from 'lucide-react';

import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import BackNavigation from '../../../components/ui/BackNavigation';
import { EmptyStatePresets } from '../../../components/ui/EmptyState';
import LoadingState from '../../../components/ui/LoadingState';
import WorkflowBadge from '../../../components/ui/WorkflowBadge';
import PaymentStatusBadge from '../../clients/components/PaymentStatusBadge';

import { quotationService } from '../../../services/quotation.service';

import type { QuotationListItem } from '../../quotations/types/quotationList.types';

import { ROUTES } from '../../../constants/routes';
import { toastError } from '../../../utils/toast';

const currency = (value: number) => `₹${value.toLocaleString()}`;

const UpcomingEventsPage = () => {
  const [events, setEvents] = useState<QuotationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadEvents = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await quotationService.getUpcomingEvents();

      setEvents(data);
    } catch (err) {
      console.error(err);

      setError('Failed to load upcoming events. Please try again.');
      toastError('Failed to load upcoming events');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  if (error) {
    return (
      <div className="space-y-6">
        <BackNavigation fallbackPath="/" label="Back to Dashboard" />

        <Card>
          <div className="flex flex-col items-center gap-4 py-10 text-center">
            <p className="text-red-600">{error}</p>

            <Button onClick={loadEvents}>Retry</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <BackNavigation fallbackPath="/" label="Back to Dashboard" />

      <div>
        <h1 className="text-3xl font-bold">Upcoming Events</h1>

        <p className="mt-1 text-slate-500">
          Future shoots and celebrations, nearest first
        </p>
      </div>

      {loading ? (
        <LoadingState text="Loading upcoming events..." />
      ) : events.length === 0 ? (
        EmptyStatePresets.noUpcomingEvents()
      ) : (
        <div className="space-y-4">
          {events.map((event) => (
            <Card key={event.id}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex gap-4">
                  <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-xl bg-purple-100 text-purple-700">
                    <CalendarDays size={20} aria-hidden="true" />

                    <span className="mt-1 text-xs font-semibold">
                      {event.event_date || '—'}
                    </span>
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold text-slate-900">
                        {event.event_type}
                      </h3>

                      <WorkflowBadge status={event.workflow_status} />

                      <PaymentStatusBadge status={event.status} />
                    </div>

                    <p className="mt-1 text-sm font-medium text-slate-600">
                      {event.client_name}
                    </p>

                    <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <MapPin size={14} aria-hidden="true" />
                        {[event.venue, event.city]
                          .filter(Boolean)
                          .join(', ') || 'Location not set'}
                      </span>

                      <Link
                        to={`${ROUTES.QUOTATIONS}/${event.id}`}
                        className="font-medium text-blue-600 hover:text-blue-800"
                      >
                        {event.quotation_number}
                      </Link>

                      <span>
                        Services: {event.service_status || '—'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 text-right lg:shrink-0">
                  <div>
                    <p className="text-xs text-slate-500">Total</p>
                    <p className="font-semibold text-slate-900">
                      {currency(event.total)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">Paid</p>
                    <p className="font-semibold text-green-600">
                      {currency(event.paid)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">Pending</p>
                    <p className="font-semibold text-orange-600">
                      {currency(event.balance)}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default UpcomingEventsPage;