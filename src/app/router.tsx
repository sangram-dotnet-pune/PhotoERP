import { createHashRouter } from 'react-router-dom';

import AppLayout from '../components/layout/AppLayout';

import DashboardPage from '../features/dashboard/pages/DashboardPage';
import QuotationListPage from '../features/quotations/pages/QuotationListPage';
import ClientsPage from '../features/clients/pages/ClientsPage';
import ClientDetailsPage from '../features/clients/pages/ClientDetailsPage';
import DataManagementPage from '../features/settings/pages/DataManagementPage';
import ReportsPage from '../features/reports/pages/ReportsPage';
import RevenuePage from '../features/reports/pages/RevenuePage';
import PendingPaymentsPage from '../features/reports/pages/PendingPaymentsPage';
import UpcomingEventsPage from '../features/events/pages/UpcomingEventsPage';
import NotFoundPage from '../pages/NotFoundPage';

import { ROUTES } from '../constants/routes';
import NewQuotationPage from '../features/quotations/pages/NewQuotationPage';
import EditQuotationPage from '../features/quotations/pages/EditQuotationPage';
import ViewQuotationPage from '../features/quotations/pages/ViewQuotationPage';
import PdfPreviewPage from '../features/quotations/pages/PdfPreviewPage';

export const router = createHashRouter([
  {
    path: ROUTES.DASHBOARD,
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <DashboardPage />,
      },
      {
        path: ROUTES.QUOTATIONS.substring(1),
        element: <QuotationListPage />,
      },
      {
        path: ROUTES.CLIENTS.substring(1),
        element: <ClientsPage />,
      },
      {
        path: 'clients/:id',
        element: <ClientDetailsPage />,
      },
      {
        path: ROUTES.SETTINGS.substring(1),
        element: <DataManagementPage />,
      },
      {
        path: ROUTES.REPORTS.substring(1),
        element: <ReportsPage />,
      },
      {
        path: ROUTES.REPORTS_REVENUE.substring(1),
        element: <RevenuePage />,
      },
      {
        path: ROUTES.REPORTS_PENDING.substring(1),
        element: <PendingPaymentsPage />,
      },
      {
        path: ROUTES.UPCOMING_EVENTS.substring(1),
        element: <UpcomingEventsPage />,
      },
      {
        path: ROUTES.NEW_QUOTATION.substring(1),
        element: <NewQuotationPage />,
      },
      {
       path: 'quotations/:id',
       element: <ViewQuotationPage />,
      },
      {
       path: 'quotations/edit/:id',
       element: <EditQuotationPage />,
      },
      {
        path: '/quotation/:id/pdf',
        element: <PdfPreviewPage />,
      },
      {
        path: ROUTES.NOT_FOUND.replace('/', ''),
        element: <NotFoundPage />,
      },
    ],
  },
]);