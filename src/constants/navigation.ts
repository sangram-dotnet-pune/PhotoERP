import {
  Home,

  FileText,
  Users,
  Settings,
  BarChart3,
  FilePlus,

} from 'lucide-react';

import { ROUTES } from './routes';

export const navigationItems = [
  {
    title: 'Dashboard',
    path: ROUTES.DASHBOARD,
    icon: Home,
  },
  {
    title: 'Quotations',
    path: ROUTES.QUOTATIONS,
    icon: FileText,
  },
  {
    title: 'New Quotation',
    path: ROUTES.NEW_QUOTATION,
    icon: FilePlus,
  },
  {
    title: 'Clients',
    path: ROUTES.CLIENTS,
    icon: Users,
  },
  {
    title: 'Reports',
    path: ROUTES.REPORTS,
    icon: BarChart3,
  },
  {
    title: 'Settings',
    path: ROUTES.SETTINGS,
    icon: Settings,
  },
];