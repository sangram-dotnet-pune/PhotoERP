import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

import { ROUTES } from '../../constants/routes';

interface BackNavigationProps {
  fallbackPath?: string;
  label?: string;
  className?: string;
}

const getBackPath = (pathname: string, fallbackPath?: string): string => {
  if (fallbackPath) {
    return fallbackPath;
  }

  if (pathname.startsWith('/clients/')) {
    return ROUTES.CLIENTS;
  }

  if (pathname.startsWith('/quotations/')) {
    if (pathname.includes('/edit/')) {
      const id = pathname.split('/')[2];
      return `/quotations/${id}`;
    }
    return ROUTES.QUOTATIONS;
  }

  if (pathname.startsWith('/reports/')) {
    return ROUTES.REPORTS;
  }

  if (pathname.startsWith('/events/')) {
    return ROUTES.DASHBOARD;
  }

  if (pathname.startsWith('/quotation/')) {
    const id = pathname.split('/')[2];
    return `/quotations/${id}`;
  }

  return ROUTES.DASHBOARD;
};

const BackNavigation = ({
  fallbackPath,
  label,
  className = '',
}: BackNavigationProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const backPath = getBackPath(location.pathname, fallbackPath);

  const defaultLabel = (() => {
    if (location.pathname.startsWith('/clients/')) return 'Back to Clients';
    if (location.pathname.startsWith('/quotations/edit/')) return 'Back to Quotation';
    if (location.pathname.startsWith('/quotations/')) return 'Back to Quotations';
    if (location.pathname.startsWith('/reports/')) return 'Back to Reports';
    if (location.pathname.startsWith('/events/')) return 'Back to Dashboard';
    if (location.pathname.startsWith('/quotation/')) return 'Back to Quotation';
    return 'Back';
  })();

  const displayLabel = label || defaultLabel;

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    navigate(backPath);
  };

  return (
    <Link
      to={backPath}
      onClick={handleClick}
      className={`inline-flex items-center gap-1 text-sm font-medium text-slate-500 transition-colors hover:text-blue-600 ${className}`}
    >
      <ArrowLeft size={16} />
      {displayLabel}
    </Link>
  );
};

export default BackNavigation;