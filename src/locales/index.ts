import { useAppStore } from '@/stores/useAppStore';
import { vi } from './vi';
import { en } from './en';

export type Language = 'vi' | 'en';

export const locales = {
  vi,
  en,
};

export const useTranslation = () => {
  const language = useAppStore((state) => state.language);
  const setLanguage = useAppStore((state) => state.setLanguage);

  const t = locales[language] || locales.vi;

  return {
    t,
    language,
    setLanguage,
  };
};

export { vi, en };
