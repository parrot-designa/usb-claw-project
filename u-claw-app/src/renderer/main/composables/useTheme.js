import { useThemeStore } from '../stores/theme';

export function useTheme() {
  const store = useThemeStore();

  function toggleTheme() {
    store.toggle();
  }

  function initTheme() {
    store.init();
  }

  return { toggleTheme, initTheme };
}