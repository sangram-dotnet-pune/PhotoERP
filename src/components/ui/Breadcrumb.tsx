import { Link, useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

import { ROUTES } from '../../constants/routes';

interface BreadcrumbItem {
  label: string;
  path: string | undefined;
}

const routeLabels: Record<string, string> = {
  [ROUTES.DASHBOARD]: 'Dashboard',
  [ROUTES.QUOTATIONS]: 'Quotations',
  [ROUTES.NEW_QUOTATION]: 'New Quotation',
  [ROUTES.CLIENTS]: 'Clients',
  [ROUTES.EXPENSES]: 'Expenses',
  [ROUTES.REPORTS]: 'Reports',
  [ROUTES.REPORTS_REVENUE]: 'Revenue',
  [ROUTES.REPORTS_PENDING]: 'Pending Payments',
  [ROUTES.UPCOMING_EVENTS]: 'Upcoming Events',
  [ROUTES.SETTINGS]: 'Settings',
};

const getBreadcrumbs = (pathname: string): BreadcrumbItem[] => {
  const breadcrumbs: BreadcrumbItem[] = [];

  const segments = pathname.split('/').filter(Boolean);

  if (segments.length === 0) {
    return [{ label: 'Dashboard', path: ROUTES.DASHBOARD }];
  }

  let currentPath = '';

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    currentPath += `/${segment}`;

    const isLast = i === segments.length - 1;

    let label = segment;
    let path: string | undefined = currentPath;

    if (segment === 'quotations' && i + 1 < segments.length) {
      const nextSegment = segments[i + 1];
      if (nextSegment === 'new') {
        label = 'New Quotation';
        path = ROUTES.NEW_QUOTATION;
      } else if (nextSegment === 'edit') {
        label = 'Edit';
        path = undefined;
      } else if (!isNaN(Number(nextSegment))) {
        label = `QT-${nextSegment.padStart(6, '0')}`;
        path = undefined;
      }
      i++;
      currentPath += `/${segments[i]}`;
      continue;
    }

    if (segment === 'clients' && i + 1 < segments.length) {
      const nextSegment = segments[i + 1];
      if (!isNaN(Number(nextSegment))) {
        label = 'Client Details';
        path = undefined;
      }
      i++;
      currentPath += `/${segments[i]}`;
      continue;
    }

    if (segment === 'reports' && i + 1 < segments.length) {
      const nextSegment = segments[i + 1];
      if (nextSegment === 'revenue') {
        label = 'Revenue';
        path = ROUTES.REPORTS_REVENUE;
      } else if (nextSegment === 'pending') {
        label = 'Pending Payments';
        path = ROUTES.REPORTS_PENDING;
      }
      i++;
      currentPath += `/${segments[i]}`;
      continue;
    }

    if (segment === 'events' && i + 1 < segments.length) {
      const nextSegment = segments[i + 1];
      if (nextSegment === 'upcoming') {
        label = 'Upcoming Events';
        path = ROUTES.UPCOMING_EVENTS;
      }
      i++;
      currentPath += `/${segments[i]}`;
      continue;
    }

    if (segment === 'quotation' && i + 1 < segments.length) {
      const nextSegment = segments[i + 1];
      if (!isNaN(Number(nextSegment))) {
        label = 'PDF Preview';
        path = undefined;
      }
      i++;
      currentPath += `/${segments[i]}`;
      continue;
    }

    if (routeLabels[currentPath]) {
      label = routeLabels[currentPath];
    } else {
      label = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
    }

    breadcrumbs.push({
      label,
      path: isLast ? undefined : path,
    });
  }

  return breadcrumbs;
};

const Breadcrumb = () => {
  const location = useLocation();
  const breadcrumbs = getBreadcrumbs(location.pathname);

  if (breadcrumbs.length <= 1) {
    return null;
  }

  return (
    <nav
      className="mb-4 flex flex-wrap items-center gap-1 text-sm text-slate-500"
      aria-label="Breadcrumb"
    >
      <ol className="flex flex-wrap items-center gap-1">
        {breadcrumbs.map((item, index) => (
          <li key={index} className="flex items-center gap-1">
            {index > 0 && (
              <ChevronRight
                size={14}
                className="text-slate-300 flex-shrink-0"
                aria-hidden="true"
              />
            )}
            {item.path ? (
              <Link
                to={item.path}
                className="font-medium text-blue-600 hover:text-blue-800 transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span
                className={index === breadcrumbs.length - 1
                  ? 'font-medium text-slate-900'
                  : 'text-slate-500'}
                aria-current={index === breadcrumbs.length - 1 ? 'page' : undefined}
              >
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};

export default Breadcrumb;