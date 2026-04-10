import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import i18n from '@/i18n';

type Language = 'en' | 'ur';

interface LanguageState {
  language: Language;
  setLanguage: (language: Language) => void;
  toggleLanguage: () => void;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set, get) => ({
      language: 'en',
      
      setLanguage: (language) => {
        set({ language });
        i18n.changeLanguage(language);
        document.documentElement.setAttribute('lang', language);
        document.documentElement.setAttribute('dir', language === 'ur' ? 'rtl' : 'ltr');
      },
      
      toggleLanguage: () => {
        const newLanguage = get().language === 'en' ? 'ur' : 'en';
        set({ language: newLanguage });
        i18n.changeLanguage(newLanguage);
        document.documentElement.setAttribute('lang', newLanguage);
        document.documentElement.setAttribute('dir', newLanguage === 'ur' ? 'rtl' : 'ltr');
      },
    }),
    {
      name: 'aks-digirec-language',
      onRehydrateStorage: () => (state) => {
        if (state) {
          i18n.changeLanguage(state.language);
          document.documentElement.setAttribute('lang', state.language);
          document.documentElement.setAttribute('dir', state.language === 'ur' ? 'rtl' : 'ltr');
        }
      },
    }
  )
);
