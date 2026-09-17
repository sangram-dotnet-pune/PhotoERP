import clsx from 'clsx';

const WORKFLOW_COLORS: Record<string, string> = {
  Draft: 'bg-slate-100 text-slate-700',
  Sent: 'bg-blue-100 text-blue-700',
  Confirmed: 'bg-indigo-100 text-indigo-700',
  Completed: 'bg-green-100 text-green-700',
  Cancelled: 'bg-red-100 text-red-700',
};

interface WorkflowBadgeProps {
  status: string;
}

const WorkflowBadge = ({ status }: WorkflowBadgeProps) => {
  return (
    <span
      className={clsx(
        'inline-block rounded-full px-3 py-1 text-xs font-semibold',
        WORKFLOW_COLORS[status] || 'bg-slate-100 text-slate-700',
      )}
    >
      {status}
    </span>
  );
};

export default WorkflowBadge;
