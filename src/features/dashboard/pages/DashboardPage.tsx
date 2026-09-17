import {
  FileText,
  IndianRupee,
  Calendar,
  Wallet,
  ListChecks,
} from 'lucide-react';

import StatCard from '../components/StatCard';
import RecentQuotations from '../components/RecentQuotations';
import RevenueSummary from '../components/RevenueSummary';
import UpcomingEvents from '../components/UpcomingEvents';
import Card from '../../../components/ui/Card';
import LoadingState from '../../../components/ui/LoadingState';

import { ROUTES } from '../../../constants/routes';

import { useDashboard } from '../hooks/useDashboard';

const WORKFLOW_COLORS: Record<string, string> = {
  Draft: 'bg-slate-100 text-slate-700',
  Sent: 'bg-blue-100 text-blue-700',
  Confirmed: 'bg-indigo-100 text-indigo-700',
  Completed: 'bg-green-100 text-green-700',
  Cancelled: 'bg-red-100 text-red-700',
};

const DashboardPage = () => {
  const { stats, revenue, loading } = useDashboard();

  if (loading) {
    return (
      <div className="space-y-8">
        <LoadingState skeleton skeletonRows={3} columns={4} className="h-20" />
        <LoadingState skeleton skeletonRows={2} columns={5} className="h-32" />
        <LoadingState skeleton skeletonRows={3} columns={3} className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>

        <p className="mt-1 text-slate-500">Welcome back 👋</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Quotations"
          value={String(stats?.total_quotations ?? 0)}
          subtitle="All quotations"
          icon={<FileText size={22} />}
          to={ROUTES.QUOTATIONS}
        />

        <StatCard
          title="Revenue"
          value={`₹${(stats?.total_revenue ?? 0).toLocaleString()}`}
          subtitle="Total Revenue"
          icon={<IndianRupee size={22} />}
          iconBg="bg-green-100 text-green-600"
          to={ROUTES.REPORTS_REVENUE}
        />

        <StatCard
          title="Pending Balance"
          value={`₹${(stats?.pending_balance ?? 0).toLocaleString()}`}
          subtitle="Awaiting Payment"
          icon={<Wallet size={22} />}
          iconBg="bg-orange-100 text-orange-600"
          to={ROUTES.REPORTS_PENDING}
        />

        <StatCard
          title="Upcoming Events"
          value={String(stats?.upcoming_events ?? 0)}
          subtitle="Future Events"
          icon={<Calendar size={22} />}
          iconBg="bg-purple-100 text-purple-600"
          to={ROUTES.UPCOMING_EVENTS}
        />
      </div>

      <Card>
        <div className="flex items-center gap-2">
          <ListChecks size={18} className="text-blue-600" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-slate-900">
            Quotation Workflow
          </h2>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {(stats?.workflow_summary ?? []).map((item) => (
            <div
              key={item.status}
              className="rounded-xl border border-slate-200 p-4"
            >
              <span
                className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                  WORKFLOW_COLORS[item.status] ||
                  'bg-slate-100 text-slate-700'
                }`}
              >
                {item.status}
              </span>

              <p className="mt-3 text-2xl font-bold text-slate-900">
                {item.count}
              </p>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <RecentQuotations quotations={stats?.recent_quotations ?? []} />
        </div>

        <div className="space-y-6">
          <UpcomingEvents quotations={stats?.upcoming_event_list ?? []} />
          <RevenueSummary revenue={revenue} />
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;