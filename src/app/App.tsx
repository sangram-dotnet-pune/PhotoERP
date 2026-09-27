import { RouterProvider } from 'react-router-dom';

import { router } from './router';
import Toast from '../components/ui/Toast';
import { AppLockProvider } from '../features/security/context/AppLockContext';
import SetupGate from '../features/setup/SetupGate';

const App = () => {
  return (
    <SetupGate>
      <AppLockProvider>
        <Toast />

        <RouterProvider router={router} />
      </AppLockProvider>
    </SetupGate>
  );
};

export default App;