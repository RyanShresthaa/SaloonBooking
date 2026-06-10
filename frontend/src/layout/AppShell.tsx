import { Outlet } from 'react-router-dom';
import { useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import RealtimeSync from '@/components/layout/RealtimeSync';
import { readStoredTheme } from '@/lib/theme';

export default function AppShell() {
  useEffect(() => {
    const stored = readStoredTheme();
    if (stored === 'dark' || stored === 'light') {
      document.documentElement.classList.toggle('dark', stored === 'dark');
      return;
    }
    // No saved choice: default to light (white UI). Pick Dark in Account to use dark mode.
    document.documentElement.classList.remove('dark');
  }, []);

  return (
    <div className="min-h-dvh bg-white transition-colors duration-200 dark:bg-stone-950">
      <a
        href="#main-content"
        className="fixed left-4 top-4 z-[100] -translate-y-24 rounded-md bg-stone-900 px-3 py-2 text-sm font-medium text-stone-50 opacity-0 shadow-lg transition focus:translate-y-0 focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 focus-visible:ring-offset-2"
      >
        Skip to content
      </a>
      <Navbar />
      <RealtimeSync />
      <main id="main-content" className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12" tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  );
}
