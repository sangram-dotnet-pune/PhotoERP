import { useNavigate } from 'react-router-dom';

import Button from '../components/ui/Button';

const NotFoundPage = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <p className="text-6xl font-bold text-slate-300">
        404
      </p>

      <h1 className="mt-4 text-2xl font-semibold text-slate-900">
        Page not found
      </h1>

      <p className="mt-2 text-slate-500">
        The page you are looking for does not exist.
      </p>

      <div className="mt-6">
        <Button onClick={() => navigate('/')}>
          Back to Dashboard
        </Button>
      </div>
    </div>
  );
};

export default NotFoundPage;