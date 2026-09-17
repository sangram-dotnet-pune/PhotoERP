import { Outlet } from 'react-router-dom';

import Header from './Header';
import Sidebar from './Sidebar';
import Breadcrumb from '../ui/Breadcrumb';

const AppLayout = () => {
  return (
    <div className="flex h-screen bg-slate-100">
      <Sidebar />

      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />

        <main className="flex-1 overflow-y-auto p-6">
          <Breadcrumb />
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;