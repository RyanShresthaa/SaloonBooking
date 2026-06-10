'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { ChevronDown } from 'lucide-react';
import { getFeatureFlags, type FeatureFlags } from '@/lib/api/meta';

const navLink =
  'rounded-md px-3 py-2 text-[13px] font-semibold tracking-wide text-stone-600 transition-colors hover:bg-stone-200/40 hover:text-stone-900 dark:text-stone-300 dark:hover:bg-stone-800/60 dark:hover:text-stone-50 relative after:absolute after:left-3 after:right-3 after:bottom-1 after:h-px after:origin-left after:scale-x-0 after:bg-stone-900 after:transition-transform hover:after:scale-x-100 dark:after:bg-stone-100';

const navLinkActive =
  'rounded-md px-3 py-2 text-[13px] font-semibold tracking-wide text-stone-900 bg-stone-200/30 dark:bg-stone-800/80 dark:text-stone-50 relative after:absolute after:left-3 after:right-3 after:bottom-1 after:h-px after:bg-stone-900 dark:after:bg-stone-100';

const dropdownItem =
  'mx-1 block rounded-md px-3 py-2.5 text-[13px] font-medium text-stone-700 transition-colors hover:bg-stone-100 hover:text-stone-900 dark:text-stone-200 dark:hover:bg-stone-800';

const dropdownItemActive = 'bg-stone-100 text-stone-900 dark:bg-stone-800 dark:text-stone-50';

function pathActive(pathname: string, to: string) {
  if (to === '/dashboard') {
    return pathname === '/dashboard';
  }
  return pathname === to || pathname.startsWith(`${to}/`);
}

type NavItem = { to: string; label: string; feature?: keyof FeatureFlags; adminOnly?: boolean };

const primaryNav: NavItem[] = [
  { to: '/dashboard', label: 'Overview' },
  { to: '/appointments', label: 'Appointments' },
  { to: '/waitlist', label: 'Waitlist', feature: 'waitlist' },
  { to: '/reviews', label: 'Reviews', feature: 'visitFeedback' },
];

const moreNav: NavItem[] = [
  { to: '/retail', label: 'Retail', feature: 'retail' },
  { to: '/templates', label: 'Templates', feature: 'bulkNotify' },
  { to: '/notifications', label: 'Bulk notify', feature: 'bulkNotify' },
  { to: '/logs', label: 'Logs' },
  { to: '/staff', label: 'Staff', adminOnly: true },
  { to: '/account', label: 'Account' },
];

const defaultFlags: FeatureFlags = {
  reminderEmails: true,
  retail: true,
  waitlist: true,
  visitFeedback: true,
  bulkNotify: true,
  publicBooking: true,
  stripeDeposits: false,
};

function filterByFeatures(items: NavItem[], flags: FeatureFlags) {
  return items.filter((item) => !item.feature || flags[item.feature] !== false);
}

function filterNavForUser(items: NavItem[], flags: FeatureFlags, role: string | undefined) {
  return filterByFeatures(items, flags).filter((item) => !item.adminOnly || role === 'admin');
}

export default function Navbar() {
  const { user, isAuthenticated, logout, hydrate } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;
  const [moreOpen, setMoreOpen] = useState(false);
  const moreWrapRef = useRef<HTMLDivElement>(null);

  const { data: featureData } = useQuery({
    queryKey: ['features'],
    queryFn: async () => (await getFeatureFlags()).data.data as FeatureFlags,
    staleTime: 5 * 60_000,
    enabled: isAuthenticated,
  });

  const flags = featureData ?? defaultFlags;
  const primaryVisible = useMemo(() => filterByFeatures(primaryNav, flags), [flags]);
  const moreVisible = useMemo(() => filterNavForUser(moreNav, flags, user?.role), [flags, user?.role]);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!moreOpen) return;
    const close = (e: MouseEvent) => {
      if (moreWrapRef.current && !moreWrapRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMoreOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', onKey);
    };
  }, [moreOpen]);

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const moreHasActive = moreVisible.some((item) => pathActive(pathname, item.to));

  return (
    <header className="sticky top-0 z-50 border-b border-stone-200/80 bg-white/95 backdrop-blur-md transition-colors dark:border-stone-700/80 dark:bg-stone-950/95">
      <div className="mx-auto flex h-14 min-h-14 max-w-6xl items-center gap-4 px-4 sm:gap-6 sm:px-6">
        <Link
          to="/"
          className="group flex shrink-0 items-baseline gap-2 rounded-md py-2 pr-1 focus-ring sm:pr-2"
        >
          <span className="font-display text-lg font-semibold tracking-tight text-stone-900 dark:text-stone-50">
            Salon
          </span>
          <span className="hidden text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-400 sm:inline dark:text-stone-500">
            desk
          </span>
        </Link>

        {isAuthenticated ? (
          <nav className="hidden min-w-0 flex-1 items-center justify-center gap-1 md:flex" aria-label="Main">
            {primaryVisible.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={pathActive(pathname, item.to) ? navLinkActive : navLink}
              >
                {item.label}
              </Link>
            ))}
            <div className="relative pl-1" ref={moreWrapRef}>
              <button
                type="button"
                onClick={() => setMoreOpen((o) => !o)}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-[13px] font-semibold tracking-wide transition-colors focus-ring ${
                  moreHasActive || moreOpen
                    ? 'bg-stone-200/30 text-stone-900 dark:bg-stone-800/80 dark:text-stone-50'
                    : 'text-stone-600 hover:bg-stone-200/40 hover:text-stone-900 dark:text-stone-300 dark:hover:bg-stone-800/60'
                }`}
                aria-expanded={moreOpen}
                aria-haspopup="true"
                aria-controls="nav-more-menu"
              >
                More
                <ChevronDown
                  className={`h-3.5 w-3.5 shrink-0 opacity-70 transition-transform ${moreOpen ? 'rotate-180' : ''}`}
                  aria-hidden
                />
              </button>
              {moreOpen && (
                <div
                  id="nav-more-menu"
                  role="menu"
                  className="absolute right-0 top-full z-50 mt-2 min-w-[12.5rem] rounded-lg border border-stone-200/90 bg-white py-1.5 shadow-lg ring-1 ring-black/5 dark:border-stone-700 dark:bg-stone-900 dark:ring-stone-800"
                >
                  {moreVisible.map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      role="menuitem"
                      className={`${dropdownItem} ${pathActive(pathname, item.to) ? dropdownItemActive : ''}`}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </nav>
        ) : (
          <span className="min-w-0 flex-1" aria-hidden />
        )}

        <div
          className={`flex shrink-0 items-center gap-3 sm:gap-4 ${isAuthenticated ? 'md:border-l md:border-stone-200/70 md:pl-5 dark:md:border-stone-700/70' : ''}`}
        >
          {isAuthenticated ? (
            <>
              <span className="hidden max-w-[11rem] truncate text-xs leading-snug text-stone-500 sm:block dark:text-stone-400">
                {user?.name}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-md px-2.5 py-2 text-xs font-semibold uppercase tracking-wider text-stone-500 transition hover:bg-stone-200/50 hover:text-stone-900 focus-ring dark:text-stone-400 dark:hover:bg-stone-800/60 dark:hover:text-stone-100"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="rounded-md px-3 py-2 text-xs font-semibold uppercase tracking-wider text-stone-600 transition hover:bg-stone-200/40 hover:text-stone-900 focus-ring dark:text-stone-300 dark:hover:bg-stone-800/50"
              >
                Sign in
              </Link>
              <Link
                to="/register"
                className="rounded-md border border-stone-900 bg-stone-900 px-3.5 py-2 text-xs font-semibold uppercase tracking-wider text-stone-50 transition hover:bg-stone-800 focus-ring dark:border-stone-100 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
              >
                Register
              </Link>
            </>
          )}
        </div>
      </div>

      {isAuthenticated && <MobileNav pathname={pathname} primaryItems={primaryVisible} moreItems={moreVisible} />}
    </header>
  );
}

function MobileNav({
  pathname,
  primaryItems,
  moreItems,
}: {
  pathname: string;
  primaryItems: NavItem[];
  moreItems: NavItem[];
}) {
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  return (
    <div className="border-t border-stone-200/60 bg-white md:hidden dark:border-stone-800/80 dark:bg-stone-950">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <nav
          className="flex flex-wrap items-center gap-x-1 gap-y-1 py-2.5 [-webkit-tap-highlight-color:transparent]"
          aria-label="Mobile"
        >
          {primaryItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`whitespace-nowrap rounded-md px-3 py-2 text-xs font-semibold ${
                pathActive(pathname, item.to)
                  ? 'bg-stone-200/40 text-stone-900 dark:bg-stone-800 dark:text-stone-50'
                  : 'text-stone-700 hover:bg-stone-200/30 dark:text-stone-300 dark:hover:bg-stone-800/50'
              }`}
            >
              {item.label}
            </Link>
          ))}
          <button
            type="button"
            onClick={() => setMoreOpen((o) => !o)}
            className={`inline-flex items-center gap-1 whitespace-nowrap rounded-md px-3 py-2 text-xs font-semibold ${
              moreOpen || moreItems.some((i) => pathActive(pathname, i.to))
                ? 'bg-stone-200/40 text-stone-900 dark:bg-stone-800 dark:text-stone-50'
                : 'text-stone-700 hover:bg-stone-200/30 dark:text-stone-300 dark:hover:bg-stone-800/50'
            }`}
            aria-expanded={moreOpen}
          >
            More
            <ChevronDown className={`h-3 w-3 shrink-0 ${moreOpen ? 'rotate-180' : ''}`} aria-hidden />
          </button>
        </nav>
        {moreOpen && (
          <div className="flex flex-col gap-0.5 border-t border-stone-200/60 py-2 pb-3 pl-1 dark:border-stone-800">
            {moreItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMoreOpen(false)}
                className={`rounded-md px-3 py-2.5 text-xs font-medium ${
                  pathActive(pathname, item.to)
                    ? 'bg-stone-200/35 text-stone-900 dark:bg-stone-800 dark:text-stone-50'
                    : 'text-stone-600 hover:bg-stone-200/25 dark:text-stone-300 dark:hover:bg-stone-800/40'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
