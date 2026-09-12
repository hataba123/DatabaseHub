import { create } from 'zustand';
import { DatabaseEnvironment } from '@/types/database';

interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface AppState {
  environment: DatabaseEnvironment;
  setEnvironment: (env: DatabaseEnvironment) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  globalSearchOpen: boolean;
  setGlobalSearchOpen: (open: boolean) => void;
  activeDatabaseId: string | null;
  setActiveDatabaseId: (id: string | null) => void;
  breadcrumbs: BreadcrumbItem[];
  setBreadcrumbs: (crumbs: BreadcrumbItem[]) => void;
  language: 'vi' | 'en';
  setLanguage: (lang: 'vi' | 'en') => void;
}

const getInitialLang = (): 'vi' | 'en' => {
  const saved = localStorage.getItem('dbhub_lang');
  return saved === 'en' ? 'en' : 'vi';
};

export const useAppStore = create<AppState>((set) => ({
  environment: 'Production',
  setEnvironment: (environment) => set({ environment }),
  sidebarCollapsed: false,
  setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  globalSearchOpen: false,
  setGlobalSearchOpen: (globalSearchOpen) => set({ globalSearchOpen }),
  activeDatabaseId: 'pmsc',
  setActiveDatabaseId: (activeDatabaseId) => set({ activeDatabaseId }),
  breadcrumbs: [{ label: 'Bảng tổng quan', path: '/dashboard' }],
  setBreadcrumbs: (breadcrumbs) => set({ breadcrumbs }),
  language: getInitialLang(),
  setLanguage: (language) => {
    localStorage.setItem('dbhub_lang', language);
    set({ language });
  },
}));
