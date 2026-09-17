import { ReactNode } from 'react';

import Button from './Button';
import Card from './Card';

interface EmptyStateProps {
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'outline';
    leftIcon?: ReactNode;
  };
  icon?: ReactNode;
  className?: string;
}

const EmptyState = ({
  title,
  description,
  action,
  icon,
  className = '',
}: EmptyStateProps) => {
  return (
    <Card className={`py-12 text-center ${className}`}>
      {icon && (
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm text-slate-500 max-w-md mx-auto">
        {description}
      </p>
      {action && (
        <div className="mt-6">
          <Button
            variant={action.variant || 'primary'}
            leftIcon={action.leftIcon}
            onClick={action.onClick}
          >
            {action.label}
          </Button>
        </div>
      )}
    </Card>
  );
};

export const EmptyStatePresets = {
  noQuotations: (onCreate: () => void) => (
    <EmptyState
      title="No quotations yet"
      description="Create your first quotation to get started."
      action={{
        label: 'Create Quotation',
        onClick: onCreate,
        leftIcon: <span>+</span>,
      }}
    />
  ),

  noClients: (onAdd: () => void) => (
    <EmptyState
      title="No clients yet"
      description="Add a client or create a quotation to get started."
      action={{
        label: 'Add Client',
        onClick: onAdd,
        leftIcon: <span>+</span>,
      }}
    />
  ),

  noPayments: () => (
    <EmptyState
      title="No payments recorded yet"
      description="Payments will appear here when a client makes a payment."
    />
  ),

  noPendingPayments: () => (
    <EmptyState
      title="No outstanding payments"
      description="All quotation balances are currently cleared."
    />
  ),

  noUpcomingEvents: () => (
    <EmptyState
      title="No upcoming events"
      description="Your future photography events will appear here."
    />
  ),

  noSearchResults: () => (
    <EmptyState
      title="No matching results found"
      description="Try changing your search or filters."
    />
  ),

  noData: (title: string, description: string) => (
    <EmptyState title={title} description={description} />
  ),

  loading: () => (
    <Card className="py-12 text-center">
      <div className="mx-auto mb-4 flex h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      <p className="text-sm text-slate-500">Loading...</p>
    </Card>
  ),

  error: (message: string, onRetry: () => void) => (
    <Card className="py-12 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
        <svg
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-slate-900">Unable to load data</h3>
      <p className="mt-2 text-sm text-slate-500">{message}</p>
      <Button variant="outline" onClick={onRetry} className="mt-4">
        Try Again
      </Button>
    </Card>
  ),
};

export default EmptyState;