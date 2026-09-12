import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { LoginPage } from '@/features/auth/LoginPage';
import { AccessDeniedPage } from '@/components/common/AccessDeniedPage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { DatabaseListPage } from '@/features/databases/DatabaseListPage';
import { DatabaseDetailPage } from '@/features/databases/DatabaseDetailPage';
import { TableDataBrowserPage } from '@/features/data-browser/TableDataBrowserPage';
import { ComparePage } from '@/features/compare/ComparePage';
import { SyncPage } from '@/features/sync/SyncPage';
import { SyncHistoryPage } from '@/features/sync/SyncHistoryPage';
import { AuditLogsPage } from '@/features/audit/AuditLogsPage';
import { MonitoringPage } from '@/features/monitoring/MonitoringPage';
import { UsersPage } from '@/features/users/UsersPage';
import { RolesPage } from '@/features/roles/RolesPage';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { PERMISSIONS } from '@/types/auth';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/403',
    element: <AccessDeniedPage />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <DashboardPage />,
      },
      {
        path: 'databases',
        element: <DatabaseListPage />,
      },
      {
        path: 'databases/:databaseId',
        element: <DatabaseDetailPage />,
      },
      {
        path: 'databases/:databaseId/tables',
        element: <DatabaseDetailPage />,
      },
      {
        path: 'databases/:databaseId/tables/:tableName',
        element: <TableDataBrowserPage />,
      },
      {
        path: 'databases/:databaseId/views',
        element: <DatabaseDetailPage />,
      },
      {
        path: 'databases/:databaseId/procedures',
        element: <DatabaseDetailPage />,
      },
      {
        path: 'compare',
        element: <ComparePage />,
      },
      {
        path: 'sync',
        element: <SyncPage />,
      },
      {
        path: 'sync/history',
        element: <SyncHistoryPage />,
      },
      {
        path: 'audit-logs',
        element: (
          <ProtectedRoute requiredPermission={PERMISSIONS.AUDIT_VIEW}>
            <AuditLogsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'monitoring',
        element: (
          <ProtectedRoute requiredPermission={PERMISSIONS.MONITORING_VIEW}>
            <MonitoringPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'users',
        element: (
          <ProtectedRoute requiredPermission={PERMISSIONS.USER_VIEW}>
            <UsersPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'roles',
        element: (
          <ProtectedRoute requiredPermission={PERMISSIONS.ROLE_VIEW}>
            <RolesPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'settings',
        element: <SettingsPage />,
      },
      {
        path: 'settings/connections',
        element: <SettingsPage />,
      },
      {
        path: 'settings/general',
        element: <SettingsPage />,
      },
      {
        path: '*',
        element: <Navigate to="/dashboard" replace />,
      },
    ],
  },
]);
