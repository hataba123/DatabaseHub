import React from 'react';
import {
  Layout,
  Button,
  Dropdown,
  Badge,
  Avatar,
  Space,
  Tag,
  Typography,
  Popover,
  List,
  message,
} from 'antd';
import {
  SearchOutlined,
  BellOutlined,
  UserOutlined,
  DatabaseOutlined,
  DownOutlined,
  SettingOutlined,
  LogoutOutlined,
  QuestionCircleOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  GlobalOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/stores/useAppStore';
import { useTranslation } from '@/locales';
import { DatabaseEnvironment } from '@/types/database';
import { designConstants } from '@/styles/theme';
import { useAuthStore } from '@/stores/useAuthStore';

const { Header } = Layout;
const { Text } = Typography;

export const AppHeader: React.FC = () => {
  const { environment, setEnvironment, setGlobalSearchOpen } = useAppStore();
  const { t, language, setLanguage } = useTranslation();
  const navigate = useNavigate();

  const handleEnvChange = (env: DatabaseEnvironment) => {
    setEnvironment(env);
    message.info(
      language === 'vi'
        ? `Đã chuyển sang ngữ cảnh môi trường ${env}`
        : `Switched environment context to ${env}`
    );
  };

  const handleLanguageChange = (lang: 'vi' | 'en') => {
    setLanguage(lang);
    message.success(
      lang === 'vi' ? 'Đã đổi ngôn ngữ sang Tiếng Việt' : 'Language changed to English'
    );
  };

  const envItems = [
    {
      key: 'Production',
      label: (
        <Space>
          <Tag color="red" style={{ margin: 0 }}>PROD</Tag>
          <span>Production</span>
        </Space>
      ),
      onClick: () => handleEnvChange('Production'),
    },
    {
      key: 'Staging',
      label: (
        <Space>
          <Tag color="orange" style={{ margin: 0 }}>STG</Tag>
          <span>Staging</span>
        </Space>
      ),
      onClick: () => handleEnvChange('Staging'),
    },
    {
      key: 'Development',
      label: (
        <Space>
          <Tag color="green" style={{ margin: 0 }}>DEV</Tag>
          <span>Development</span>
        </Space>
      ),
      onClick: () => handleEnvChange('Development'),
    },
  ];

  const languageItems = [
    {
      key: 'vi',
      label: (
        <Space>
          <span style={{ fontSize: 15 }}>🇻🇳</span>
          <span style={{ fontWeight: language === 'vi' ? 600 : 400 }}>Tiếng Việt</span>
          {language === 'vi' && <Tag color="blue" style={{ marginLeft: 4, fontSize: 10 }}>Mặc định</Tag>}
        </Space>
      ),
      onClick: () => handleLanguageChange('vi'),
    },
    {
      key: 'en',
      label: (
        <Space>
          <span style={{ fontSize: 15 }}>🇬🇧</span>
          <span style={{ fontWeight: language === 'en' ? 600 : 400 }}>English</span>
        </Space>
      ),
      onClick: () => handleLanguageChange('en'),
    },
  ];

  const getEnvBadge = () => {
    switch (environment) {
      case 'Production':
        return <Tag color="error" style={{ margin: 0, fontWeight: 600 }}>Production</Tag>;
      case 'Staging':
        return <Tag color="warning" style={{ margin: 0, fontWeight: 600 }}>Staging</Tag>;
      case 'Development':
        return <Tag color="success" style={{ margin: 0, fontWeight: 600 }}>Development</Tag>;
    }
  };

  const notifications = [
    {
      id: 1,
      title: language === 'vi' ? 'Cảnh báo dung lượng Weigh Station' : 'Weigh Station Storage Warning',
      time: '12m ago',
      type: 'warning',
      desc: language === 'vi' ? 'Dung lượng đã chạm 84% (42 GB / 50 GB)' : 'Storage utilization reached 84% (42 GB / 50 GB)',
    },
    {
      id: 2,
      title: language === 'vi' ? 'Đồng bộ dữ liệu thành công' : 'Data Sync Completed',
      time: '1h ago',
      type: 'success',
      desc: language === 'vi' ? 'Đã đồng bộ schema HQ_Size sang PMSC Backup' : 'HQ_Size schema successfully synchronized to PMSC Backup',
    },
    {
      id: 3,
      title: language === 'vi' ? 'Máy chủ Backup ngoại tuyến' : 'Backup Replica Offline',
      time: '3h ago',
      type: 'warning',
      desc: language === 'vi' ? 'Mất kết nối tới máy chủ DB-SRV-04' : 'PMSC Standby replica connection timed out on DB-SRV-04',
    },
  ];

  const notificationContent = (
    <div style={{ width: 320 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8,
          paddingBottom: 8,
          borderBottom: '1px solid #f1f5f9',
        }}
      >
        <Text strong>{t.header.notifications}</Text>
        <Text type="secondary" style={{ fontSize: 12 }}>3 {t.header.unread}</Text>
      </div>
      <List
        size="small"
        dataSource={notifications}
        renderItem={(item) => (
          <List.Item style={{ padding: '8px 0', borderBottom: '1px solid #f8fafc' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              {item.type === 'warning' ? (
                <WarningOutlined style={{ color: '#f59e0b', marginTop: 3 }} />
              ) : (
                <CheckCircleOutlined style={{ color: '#10b981', marginTop: 3 }} />
              )}
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#0f172a' }}>{item.title}</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>{item.desc}</div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{item.time}</div>
              </div>
            </div>
          </List.Item>
        )}
      />
    </div>
  );

  const { user, roles, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    message.success(language === 'vi' ? 'Đã đăng xuất thành công' : 'Signed out successfully');
    navigate('/login');
  };

  const displayName = user?.displayName || user?.username || 'User';
  const displayEmail = user?.email || (user?.username ? `${user.username}@dbhub.enterprise` : '');
  const primaryRole = roles[0] || 'User';
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w: string) => w[0].toUpperCase())
    .join('') || 'U';

  const userMenuItems = [
    {
      key: 'user-info',
      label: (
        <div style={{ padding: '4px 0' }}>
          <div style={{ fontWeight: 600, color: '#0f172a' }}>{displayName}</div>
          {displayEmail && <div style={{ fontSize: 12, color: '#64748b' }}>{displayEmail}</div>}
          <Tag color="blue" style={{ marginTop: 4 }}>{primaryRole}</Tag>
        </div>
      ),
    },
    { type: 'divider' as const },
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: t.nav.profile,
      onClick: () => navigate('/users'),
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: t.nav.settings,
      onClick: () => navigate('/settings'),
    },
    {
      key: 'help',
      icon: <QuestionCircleOutlined />,
      label: t.nav.documentation,
      onClick: () => message.info('DBHub Enterprise v1.0.0 documentation'),
    },
    { type: 'divider' as const },
    {
      key: 'logout',
      icon: <LogoutOutlined style={{ color: '#ef4444' }} />,
      label: <span style={{ color: '#ef4444' }}>{t.nav.signOut}</span>,
      onClick: handleLogout,
    },
  ];

  return (
    <Header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        backgroundColor: '#ffffff',
        borderBottom: `1px solid ${designConstants.colors.borderColor}`,
        height: designConstants.headerHeight,
        lineHeight: `${designConstants.headerHeight}px`,
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
    >
      {/* Left: Logo DBHub */}
      <div
        onClick={() => navigate('/dashboard')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 6,
            background: 'linear-gradient(135deg, #1677ff 0%, #0958d9 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            fontSize: 18,
            boxShadow: '0 2px 4px rgba(22, 119, 255, 0.25)',
          }}
        >
          <DatabaseOutlined />
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.3px', color: '#0f172a' }}>
            DBHub
          </span>
          <span
            style={{
              fontSize: 10,
              padding: '1px 5px',
              backgroundColor: '#eff6ff',
              color: '#1677ff',
              borderRadius: 4,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            Enterprise
          </span>
        </div>
      </div>

      {/* Center: Global Search Bar */}
      <div style={{ flex: 1, maxWidth: 440, margin: '0 32px' }}>
        <Button
          onClick={() => setGlobalSearchOpen(true)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#f8fafc',
            borderColor: '#e2e8f0',
            color: '#64748b',
            height: 34,
            padding: '0 12px',
          }}
        >
          <Space size={8}>
            <SearchOutlined style={{ color: '#94a3b8' }} />
            <span style={{ fontSize: 13 }}>{t.header.searchPlaceholder}</span>
          </Space>
          <span
            style={{
              fontSize: 11,
              backgroundColor: '#e2e8f0',
              padding: '1px 6px',
              borderRadius: 4,
              color: '#475569',
              fontFamily: 'monospace',
              fontWeight: 600,
            }}
          >
            Ctrl K
          </span>
        </Button>
      </div>

      {/* Right: Language toggle, Environment badge, Notification, User */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {/* Language Switcher */}
        <Dropdown menu={{ items: languageItems }} trigger={['click']}>
          <Button
            size="small"
            style={{
              height: 28,
              padding: '0 10px',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              borderColor: '#e2e8f0',
              fontWeight: 500,
            }}
          >
            <GlobalOutlined style={{ color: '#1677ff', fontSize: 13 }} />
            <span>{language === 'vi' ? 'Tiếng Việt' : 'English'}</span>
            <DownOutlined style={{ fontSize: 10, color: '#94a3b8' }} />
          </Button>
        </Dropdown>

        {/* Current Environment Badge Dropdown */}
        <Dropdown menu={{ items: envItems }} trigger={['click']}>
          <Button
            size="small"
            style={{
              height: 28,
              padding: '0 8px',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              borderColor: '#e2e8f0',
            }}
          >
            {getEnvBadge()}
            <DownOutlined style={{ fontSize: 10, color: '#94a3b8' }} />
          </Button>
        </Dropdown>

        {/* Notifications Popover */}
        <Popover content={notificationContent} trigger="click" placement="bottomRight">
          <Badge count={3} size="small" offset={[-2, 4]}>
            <Button
              type="text"
              shape="circle"
              icon={<BellOutlined style={{ fontSize: 17, color: '#475569' }} />}
            />
          </Badge>
        </Popover>

        {/* User Profile Dropdown */}
        <Dropdown menu={{ items: userMenuItems }} trigger={['click']} placement="bottomRight">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: 6,
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = '#f8fafc')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
          >
            <Avatar
              size={30}
              style={{ backgroundColor: '#1677ff', fontSize: 13, fontWeight: 600 }}
            >
              {initials}
            </Avatar>
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: '#0f172a' }}>{displayName}</span>
              <span style={{ fontSize: 11, color: '#64748b' }}>{primaryRole}</span>
            </div>
            <DownOutlined style={{ fontSize: 10, color: '#94a3b8', marginLeft: 2 }} />
          </div>
        </Dropdown>
      </div>
    </Header>
  );
};
