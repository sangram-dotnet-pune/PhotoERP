import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

import { ROUTES } from '../../constants/routes';

const BackToDashboard = () => {
  return (
    <Link
      to={ROUTES.DASHBOARD}
      className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 transition-colors hover:text-blue-600"
    >
      <ArrowLeft size={16} />
      Back to Dashboard
    </Link>
  );
};

export default BackToDashboard;
