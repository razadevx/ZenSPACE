import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'default' | 'light-professional' | 'dark' | 'factory-green';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const themes: Theme[] = ['default', 'light-professional', 'dark', 'factory-green'];

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'default',
      
      setTheme: (theme) => {
        set({ theme });
        document.documentElement.setAttribute('data-theme', theme);
      },
      
      toggleTheme: () => {
        const currentIndex = themes.indexOf(get().theme);
        const nextIndex = (currentIndex + 1) % themes.length;
        const nextTheme = themes[nextIndex];
        set({ theme: nextTheme });
        document.documentElement.setAttribute('data-theme', nextTheme);
      },
    }),
    {
      name: 'aks-digirec-theme',
      onRehydrateStorage: () => (state) => {
        if (state) {
          document.documentElement.setAttribute('data-theme', state.theme);
        }
      },
    }
  )
);
