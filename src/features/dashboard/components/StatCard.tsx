import { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import Card from '../../../components/ui/Card';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  iconBg?: string;
  to?: string;
}

const StatCard = ({
  title,
  value,
  subtitle,
  icon,
  iconBg = 'bg-blue-100 text-blue-600',
  to,
}: StatCardProps) => {
  const content = (
    <Card
      hover
      className={
        to
          ? 'cursor-pointer transition-colors hover:border-blue-300'
          : undefined
      }
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500">{title}</p>

          <h2 className="mt-2 text-3xl font-bold text-slate-900">
            {value}
          </h2>

          {subtitle && (
            <p className="mt-2 text-sm text-slate-500">
              {subtitle}
            </p>
          )}
        </div>

        <div
          className={`flex h-12 w-12 items-center justify-center rounded-xl ${iconBg}`}
        >
          {icon}
        </div>
      </div>
    </Card>
  );

  if (!to) {
    return content;
  }

  return (
    <Link
      to={to}
      className="block rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
    >
      {content}
    </Link>
  );
};

export default StatCard;
