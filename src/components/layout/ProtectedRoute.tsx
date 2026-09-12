import React, { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore, ResourceScopeCheck } from '@/stores/useAuthStore';
import { AccessDeniedPage } from '@/components/common/AccessDeniedPage';
import { Spin } from 'antd';

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
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          width: '100vw',
          backgroundColor: '#0f172a',
          color: '#94a3b8',
          gap: 16,
        }}
      >
        <Spin size="large" />
        <span style={{ fontSize: 13, fontFamily: 'monospace', color: '#64748b' }}>
          Authenticating DBHub Enterprise Session...
        </span>
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
