import React from 'react';
import { Layout, Menu, Button } from 'antd';
import {
  DashboardOutlined,
  DatabaseOutlined,
  DiffOutlined,
  SyncOutlined,
  HistoryOutlined,
  LineChartOutlined,
  TeamOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppStore } from '@/stores/useAppStore';
import { useTranslation } from '@/locales';
import { designConstants } from '@/styles/theme';

import { useAuthStore } from '@/stores/useAuthStore';
import { PERMISSIONS } from '@/types/auth';

const { Sider } = Layout;

export const AppSidebar: React.FC = () => {
  const { sidebarCollapsed, toggleSidebar } = useAppStore();
  const { hasPermission } = useAuthStore();
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  // Determine active menu item based on current pathname
  const getSelectedKey = () => {
    const path = location.pathname;
    if (path === '/' || path.startsWith('/dashboard')) return '/dashboard';
    if (path.startsWith('/databases')) return '/databases';
    if (path.startsWith('/compare')) return '/compare';
    if (path.startsWith('/sync')) return '/sync';
    if (path.startsWith('/audit-logs')) return '/audit-logs';
    if (path.startsWith('/monitoring')) return '/monitoring';
    if (path.startsWith('/users')) return '/users';
    if (path.startsWith('/roles')) return '/roles';
    if (path.startsWith('/settings')) return '/settings';
    return path;
  };

  const rawMenuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined style={{ fontSize: 16 }} />,
      label: t.nav.dashboard,
      visible: true,
    },
    {
      key: '/databases',
      icon: <DatabaseOutlined style={{ fontSize: 16 }} />,
      label: t.nav.databases,
      visible: hasPermission(PERMISSIONS.DATABASE_READ) || hasPermission(PERMISSIONS.CONNECTION_VIEW),
    },
    {
      key: '/compare',
      icon: <DiffOutlined style={{ fontSize: 16 }} />,
      label: t.nav.compare,
      visible: hasPermission(PERMISSIONS.DATABASE_READ),
    },
    {
      key: '/sync',
      icon: <SyncOutlined style={{ fontSize: 16 }} />,
      label: t.nav.sync,
      visible: hasPermission(PERMISSIONS.DATABASE_INSERT) || hasPermission(PERMISSIONS.DATABASE_UPDATE),
    },
    {
      key: '/audit-logs',
      icon: <HistoryOutlined style={{ fontSize: 16 }} />,
      label: t.nav.auditLogs,
      visible: hasPermission(PERMISSIONS.AUDIT_VIEW),
    },
    {
      key: '/monitoring',
      icon: <LineChartOutlined style={{ fontSize: 16 }} />,
      label: t.nav.monitoring,
      visible: hasPermission(PERMISSIONS.MONITORING_VIEW),
    },
    {
      type: 'divider' as const,
      visible: hasPermission(PERMISSIONS.USER_VIEW) || hasPermission(PERMISSIONS.ROLE_VIEW) || hasPermission(PERMISSIONS.CONNECTION_MANAGE),
    },
    {
      key: '/users',
      icon: <TeamOutlined style={{ fontSize: 16 }} />,
      label: t.nav.users,
      visible: hasPermission(PERMISSIONS.USER_VIEW),
    },
    {
      key: '/roles',
      icon: <SafetyCertificateOutlined style={{ fontSize: 16 }} />,
      label: t.nav.roles,
      visible: hasPermission(PERMISSIONS.ROLE_VIEW),
    },
    {
      key: '/settings',
      icon: <SettingOutlined style={{ fontSize: 16 }} />,
      label: t.nav.settings,
      visible: hasPermission(PERMISSIONS.CONNECTION_MANAGE) || hasPermission(PERMISSIONS.USER_MANAGE) || hasPermission(PERMISSIONS.ROLE_MANAGE),
    },
  ];

  const menuItems = rawMenuItems.filter((item) => item.visible);

  return (
    <Sider
      collapsible
      collapsed={sidebarCollapsed}
      trigger={null}
      width={designConstants.sidebarWidth}
      collapsedWidth={designConstants.sidebarCollapsedWidth}
      style={{
        backgroundColor: '#ffffff',
        borderRight: `1px solid ${designConstants.colors.borderColor}`,
        height: `calc(100vh - ${designConstants.headerHeight}px)`,
        position: 'sticky',
        top: designConstants.headerHeight,
        left: 0,
        zIndex: 90,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ flex: 1, padding: '12px 8px', overflowY: 'auto' }}>
        <Menu
          mode="inline"
          selectedKeys={[getSelectedKey()]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ borderRight: 'none' }}
        />
      </div>

      {/* Collapse Toggle Footer */}
      <div
        style={{
          padding: '12px 16px',
          borderTop: `1px solid ${designConstants.colors.borderColor}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: sidebarCollapsed ? 'center' : 'space-between',
        }}
      >
        {!sidebarCollapsed && (
          <span style={{ fontSize: 12, color: '#94a3b8' }}>DBHub Enterprise</span>
        )}
        <Button
          type="text"
          size="small"
          onClick={toggleSidebar}
          icon={sidebarCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          style={{ color: '#64748b' }}
        />
      </div>
    </Sider>
  );
};
