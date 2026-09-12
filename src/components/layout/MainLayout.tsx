import React from 'react';
import { Layout } from 'antd';
import { Outlet } from 'react-router-dom';
import { AppHeader } from './AppHeader';
import { AppSidebar } from './AppSidebar';
import { GlobalSearchModal } from './GlobalSearchModal';
import { designConstants } from '@/styles/theme';

const { Content } = Layout;

export const MainLayout: React.FC = () => {
  return (
    <Layout style={{ minHeight: '100vh', backgroundColor: designConstants.colors.bgPage }}>
      <AppHeader />
      <Layout>
        <AppSidebar />
        <Content
          style={{
            padding: designConstants.pagePadding,
            minHeight: `calc(100vh - ${designConstants.headerHeight}px)`,
            backgroundColor: designConstants.colors.bgPage,
            overflowX: 'hidden',
          }}
        >
          <div style={{ maxWidth: 1600, margin: '0 auto' }}>
            <Outlet />
          </div>
        </Content>
      </Layout>
      <GlobalSearchModal />
    </Layout>
  );
};
