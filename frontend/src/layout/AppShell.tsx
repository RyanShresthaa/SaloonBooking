import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import RealtimeSync from '@/components/layout/RealtimeSync';
import { CustomerMotionExperience } from '@/components/motion/CustomerMotionExperience';
import { readStoredTheme } from '@/lib/theme';
import { useAuthStore } from '@/store/authStore';

/** Desk / customer routes that platform super_admin should not use (they use /platform + directory). */
function isSuperAdminBlockedDeskPath(pathname: string) {
  if (pathname === '/dashboard') return true;
  if (pathname.startsWith('/appointments')) return true;
  if (pathname.startsWith('/waitlist')) return true;
  if (pathname.startsWith('/reviews')) return true;
  if (pathname.startsWith('/retail')) return true;
  if (pathname.startsWith('/templates')) return true;
  if (pathname.startsWith('/notifications')) return true;
  if (pathname.startsWith('/logs')) return true;
  if (pathname.startsWith('/staff')) return true;
  return false;
}

/** Salon-owner / staff tools customers must not open (same pattern as super_admin isolation). */
function isCustomerBlockedSalonDeskPath(pathname: string) {
  if (pathname.startsWith('/staff')) return true;
  if (pathname.startsWith('/admin/marketplace')) return true;
  if (pathname.startsWith('/templates')) return true;
  if (pathname.startsWith('/notifications')) return true;
  if (pathname.startsWith('/logs')) return true;
  if (pathname.startsWith('/retail')) return true;
  return false;
}

function DeskOutlet() {
  const { user, isAuthenticated } = useAuthStore();
  const { pathname } = useLocation();
  if (isAuthenticated && user?.role === 'super_admin' && isSuperAdminBlockedDeskPath(pathname)) {
    return <Navigate to="/platform" replace />;
  }
  if (isAuthenticated && user?.role === 'customer' && isCustomerBlockedSalonDeskPath(pathname)) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Outlet />;
}

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
    <div
      className={`customer-app-shell min-h-dvh bg-[#f2ede6] transition-colors duration-200 dark:bg-stone-950`}
    >
      <a
        href="#main-content"
        className="fixed left-4 top-4 z-[100] -translate-y-24 rounded-md bg-stone-900 px-3 py-2 text-sm font-medium text-stone-50 opacity-0 shadow-lg transition focus:translate-y-0 focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 focus-visible:ring-offset-2"
      >
        Skip to content
      </a>
      <Navbar />
      <RealtimeSync />
      <main
        id="main-content"
        className="customer-main-rail mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12"
        tabIndex={-1}
      >
        <CustomerMotionExperience>
          <DeskOutlet />
        </CustomerMotionExperience>
      </main>
    </div>
  );
}
