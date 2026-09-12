import React, { useEffect } from 'react';
import { ConfigProvider, App as AntdApp } from 'antd';
import vi_VN from 'antd/locale/vi_VN';
import en_US from 'antd/locale/en_US';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { lightTheme } from '@/styles/theme';
import { useAppStore } from '@/stores/useAppStore';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

interface AppProvidersProps {
  children: React.ReactNode;
}

export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  const language = useAppStore((state) => state.language);

  useEffect(() => {
    dayjs.locale(language === 'vi' ? 'vi' : 'en');
  }, [language]);

  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider
        theme={lightTheme}
        locale={language === 'vi' ? vi_VN : en_US}
      >
        <AntdApp>{children}</AntdApp>
      </ConfigProvider>
    </QueryClientProvider>
  );
};
