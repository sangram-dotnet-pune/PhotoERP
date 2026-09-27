import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';

import { setupService } from '../../services/setup.service';
import SetupWizard from './SetupWizard';

interface SetupGateProps {
  children: ReactNode;
}

const SetupGate = ({ children }: SetupGateProps) => {
  const [ready, setReady] = useState(false);
  const [completed, setCompleted] = useState(true);

  useEffect(() => {
    let active = true;

    setupService
      .getStatus()
      .then((status) => {
        if (active) setCompleted(status.completed);
      })
      .catch((err) => {
        console.error('Failed to load setup status', err);
      })
      .finally(() => {
        if (active) setReady(true);
      });

    return () => {
      active = false;
    };
  }, []);

  const handleComplete = () => {
    setCompleted(true);
  };

  if (!ready) {
    return (
      <div
        className="fixed inset-0 flex items-center justify-center bg-white"
        role="status"
        aria-label="Loading"
      >
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!completed) {
    return <SetupWizard onComplete={handleComplete} />;
  }

  return <>{children}</>;
};

export default SetupGate;