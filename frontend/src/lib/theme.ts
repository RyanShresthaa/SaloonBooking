export const THEME_KEY = 'salon-theme';

export type ThemeChoice = 'light' | 'dark';

export function applyTheme(mode: ThemeChoice) {
  localStorage.setItem(THEME_KEY, mode);
  document.documentElement.classList.toggle('dark', mode === 'dark');
}

export function readStoredTheme(): ThemeChoice | null {
  const v = localStorage.getItem(THEME_KEY);
  return v === 'dark' || v === 'light' ? v : null;
}
