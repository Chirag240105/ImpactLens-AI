import { useEffect } from 'react';
import { Navigate, Outlet, useLocation, useRouteError } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';
import { ErrorState } from '@/components/ui/Feedback';
import { FullPageLoader } from './Loaders';

function useSession() {
  const status = useAuthStore((s) => s.status);
  const bootstrap = useAuthStore((s) => s.bootstrap);
  useEffect(() => {
    if (status === 'unknown') void bootstrap();
  }, [status, bootstrap]);
  return status;
}

export function RequireAuth() {
  const status = useSession();
  const location = useLocation();
  if (status === 'unknown') return <FullPageLoader />;
  if (status === 'anonymous') return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return <Outlet />;
}

export function GuestOnly() {
  const status = useSession();
  if (status === 'unknown') return <FullPageLoader />;
  if (status === 'authenticated') return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

export function RouteError() {
  const error = useRouteError();
  return (
    <div className="grid min-h-dvh place-items-center bg-bg p-6">
      <ErrorState error={error} title="This page failed to load" onRetry={() => window.location.reload()} />
    </div>
  );
}
