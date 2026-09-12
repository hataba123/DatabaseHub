import React, { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore, ResourceScopeCheck } from '@/stores/useAuthStore';
import { AccessDeniedPage } from '@/components/common/AccessDeniedPage';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  requiredPermission?: string;
  scope?: ResourceScopeCheck;
  children?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  requiredPermission,
  scope,
  children,
}) => {
  const location = useLocation();
  const { isAuthenticated, isLoading, isInitialized, initializeAuth, hasPermission } = useAuthStore();

  useEffect(() => {
    if (!isInitialized) {
      initializeAuth();
    }
  }, [isInitialized, initializeAuth]);

  if (!isInitialized || isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-950 text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
          <p className="text-xs font-mono text-slate-500">Authenticating DBHub Enterprise Session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredPermission && !hasPermission(requiredPermission, scope)) {
    return <AccessDeniedPage requiredPermission={requiredPermission} />;
  }

  return children ? <>{children}</> : <Outlet />;
};
