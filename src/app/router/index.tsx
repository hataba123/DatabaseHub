import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { DatabaseListPage } from '@/features/databases/DatabaseListPage';
import { DatabaseDetailPage } from '@/features/databases/DatabaseDetailPage';
import { TableDataBrowserPage } from '@/features/data-browser/TableDataBrowserPage';
import { ComparePage } from '@/features/compare/ComparePage';
import { SyncPage } from '@/features/sync/SyncPage';
import { AuditLogsPage } from '@/features/audit/AuditLogsPage';
import { MonitoringPage } from '@/features/monitoring/MonitoringPage';
import { UsersPage } from '@/features/users/UsersPage';
import { RolesPage } from '@/features/roles/RolesPage';
import { SettingsPage } from '@/features/settings/SettingsPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
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
        path: 'audit-logs',
        element: <AuditLogsPage />,
      },
      {
        path: 'monitoring',
        element: <MonitoringPage />,
      },
      {
        path: 'users',
        element: <UsersPage />,
      },
      {
        path: 'roles',
        element: <RolesPage />,
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
