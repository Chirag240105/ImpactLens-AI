import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemePreference = 'light' | 'dark' | 'system';

interface UiState {
  theme: ThemePreference;
  isNavOpen: boolean;
  isCommandOpen: boolean;
  mediaView: 'grid' | 'list';
}
interface UiActions {
  setTheme: (theme: ThemePreference) => void;
  openNav: () => void;
  closeNav: () => void;
  setCommandOpen: (open: boolean) => void;
  toggleCommand: () => void;
  setMediaView: (view: UiState['mediaView']) => void;
}

export const useUiStore = create<UiState & UiActions>()(
  persist(
    (set) => ({
      theme: 'light',
      isNavOpen: false,
      isCommandOpen: false,
      mediaView: 'grid',
      setTheme: (theme) => set({ theme }),
      openNav: () => set({ isNavOpen: true }),
      closeNav: () => set({ isNavOpen: false }),
      setCommandOpen: (isCommandOpen) => set({ isCommandOpen }),
      toggleCommand: () => set((s) => ({ isCommandOpen: !s.isCommandOpen })),
      setMediaView: (mediaView) => set({ mediaView }),
    }),
    {
      name: 'impactlens-ui',
      version: 1,
      // Only preferences survive reloads; transient overlay state does not.
      partialize: (s) => ({ theme: s.theme, mediaView: s.mediaView }),
    },
  ),
);

export const resolveTheme = (pref: ThemePreference): 'light' | 'dark' =>
  pref === 'system'
    ? typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
    : pref;
