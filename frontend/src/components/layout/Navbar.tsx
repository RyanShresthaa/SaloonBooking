'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { ChevronDown } from 'lucide-react';
import { getFeatureFlags, type FeatureFlags } from '@/lib/api/meta';

// Styles

const navLink =
  'rounded-full px-3.5 py-2 text-[13px] font-medium tracking-wide text-[#78716c] transition-[color,background-color,box-shadow] duration-200 hover:bg-black/[0.035] hover:text-[#1c1917] dark:text-stone-400 dark:hover:bg-stone-800/50 dark:hover:text-stone-100';

const navLinkActive =
  'rounded-full px-3.5 py-2 text-[13px] font-semibold tracking-wide text-[#1c1917] shadow-[inset_0_-2px_0_0_#b07d62,0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-[#e0d9d0] bg-white/90 dark:bg-stone-900/90 dark:text-stone-50 dark:ring-stone-600';

const dropdownItem =
  'mx-1 block rounded-md px-3 py-2.5 text-[13px] font-medium text-stone-700 transition-colors hover:bg-stone-100 hover:text-stone-900 dark:text-stone-200 dark:hover:bg-stone-800';

const dropdownItemActive = 'bg-stone-100 text-stone-900 dark:bg-stone-800 dark:text-stone-50';

// Types & constants

type NavItem = { to: string; label: string; feature?: keyof FeatureFlags; adminOnly?: boolean; superOnly?: boolean };

/** Customer: discover salons first, then personal overview and bookings. */
const PRIMARY_NAV: NavItem[] = [
  { to: '/marketplace', label: 'Salons' },
  { to: '/dashboard', label: 'Overview' },
  { to: '/appointments', label: 'Appointments' },
  { to: '/waitlist', label: 'Waitlist', feature: 'waitlist' },
  { to: '/reviews', label: 'Reviews', feature: 'visitFeedback' },
];

/** Salon admin & staff: operations first; directory last (still one click away). */
const PRIMARY_NAV_DESK: NavItem[] = [
  { to: '/dashboard', label: 'Overview' },
  { to: '/appointments', label: 'Appointments' },
  { to: '/waitlist', label: 'Waitlist', feature: 'waitlist' },
  { to: '/reviews', label: 'Reviews', feature: 'visitFeedback' },
  { to: '/marketplace', label: 'Salons' },
];

/** Super admin: directory + platform hub only (no loyalty / personal bookings nav). */
const PRIMARY_NAV_SUPER_ADMIN: NavItem[] = [
  { to: '/platform', label: 'Platform' },
  { to: '/marketplace', label: 'Salons' },
];

const MORE_NAV_SUPER_ADMIN: NavItem[] = [
  { to: '/admin/marketplace', label: 'Listings', adminOnly: true },
  { to: '/account', label: 'Account' },
];

/** Tenant salon owner: listings & team + ops tools (no platform / super-only noise). */
const MORE_NAV_SALON_ADMIN: NavItem[] = [
  { to: '/marketplace/my-listing', label: 'Public profile' },
  { to: '/admin/marketplace', label: 'Listings', adminOnly: true },
  { to: '/staff', label: 'Staff', adminOnly: true },
  { to: '/retail', label: 'Retail', feature: 'retail' },
  { to: '/templates', label: 'Templates', feature: 'bulkNotify' },
  { to: '/notifications', label: 'Bulk notify', feature: 'bulkNotify' },
  { to: '/logs', label: 'Logs' },
  { to: '/account', label: 'Account' },
];

/** Salon staff: day-to-day tools only (no tenant owner screens). */
const MORE_NAV_SALON_STAFF: NavItem[] = [
  { to: '/marketplace/my-listing', label: 'Public profile' },
  { to: '/retail', label: 'Retail', feature: 'retail' },
  { to: '/templates', label: 'Templates', feature: 'bulkNotify' },
  { to: '/notifications', label: 'Bulk notify', feature: 'bulkNotify' },
  { to: '/logs', label: 'Logs' },
  { to: '/account', label: 'Account' },
];

const MORE_NAV: NavItem[] = [
  { to: '/platform', label: 'Platform', adminOnly: true, superOnly: true },
  { to: '/retail',        label: 'Retail',       feature: 'retail' },
  { to: '/templates',     label: 'Templates',    feature: 'bulkNotify' },
  { to: '/notifications', label: 'Bulk notify',  feature: 'bulkNotify' },
  { to: '/logs',          label: 'Logs' },
  { to: '/staff',         label: 'Staff',        adminOnly: true },
  { to: '/admin/marketplace', label: 'Listings', adminOnly: true },
  { to: '/account',       label: 'Account' },
];

const DEFAULT_FLAGS: FeatureFlags = {
  reminderEmails:  true,
  retail:          true,
  waitlist:        true,
  visitFeedback:   true,
  bulkNotify:      true,
  publicBooking:   true,
  stripeDeposits:  false,
};

// Helpers

function pathActive(pathname: string, to: string) {
  if (to === '/dashboard') return pathname === '/dashboard';
  if (to === '/marketplace/my-listing') return pathname === '/marketplace/my-listing';
  if (to === '/marketplace') {
    const reserved = ['/marketplace/apply', '/marketplace/my-listing'];
    if (reserved.includes(pathname)) return false;
    return pathname === '/marketplace' || pathname.startsWith('/marketplace/');
  }
  if (to === '/platform') return pathname === '/platform' || pathname.startsWith('/platform/');
  return pathname === to || pathname.startsWith(`${to}/`);
}

function filterByFeatures(items: NavItem[], flags: FeatureFlags) {
  return items.filter((item) => !item.feature || flags[item.feature] !== false);
}

function filterNavForUser(items: NavItem[], flags: FeatureFlags, role: string | undefined) {
  return filterByFeatures(items, flags).filter((item) => {
    if (item.superOnly) return role === 'super_admin';
    if (!item.adminOnly) return true;
    return role === 'admin' || role === 'super_admin';
  });
}

// Navbar

export default function Navbar() {
  const { user, isAuthenticated, logout, hydrate } = useAuthStore();
  const navigate  = useNavigate();
  const { pathname } = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreWrapRef = useRef<HTMLDivElement>(null);

  const { data: featureData } = useQuery({
    queryKey: ['features'],
    queryFn: async () => (await getFeatureFlags()).data.data as FeatureFlags,
    staleTime: 5 * 60_000,
    enabled: isAuthenticated,
  });

  const flags = featureData ?? DEFAULT_FLAGS;
  const isSuperAdmin = user?.role === 'super_admin';
  const isSalonDesk = user?.role === 'admin' || user?.role === 'staff';
  const primaryVisible = useMemo(() => {
    if (isSuperAdmin) return filterByFeatures(PRIMARY_NAV_SUPER_ADMIN, flags);
    if (isSalonDesk) return filterByFeatures(PRIMARY_NAV_DESK, flags);
    return filterByFeatures(PRIMARY_NAV, flags);
  }, [flags, isSuperAdmin, isSalonDesk]);
  const moreVisible = useMemo(() => {
    if (isSuperAdmin) return filterByFeatures(MORE_NAV_SUPER_ADMIN, flags);
    if (user?.role === 'admin') return filterByFeatures(MORE_NAV_SALON_ADMIN, flags);
    if (user?.role === 'staff') return filterByFeatures(MORE_NAV_SALON_STAFF, flags);
    return filterNavForUser(MORE_NAV, flags, user?.role);
  }, [flags, user?.role, isSuperAdmin]);

  // Stable ref so hydrate identity changes don't retrigger the effect
  const hydrateRef = useRef(hydrate);
  useEffect(() => { hydrateRef.current = hydrate; });
  useEffect(() => { hydrateRef.current(); }, []);

  // Close "More" on outside click or Escape
  useEffect(() => {
    if (!moreOpen) return;
    const onMouse = (e: MouseEvent) => {
      if (moreWrapRef.current && !moreWrapRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMoreOpen(false); };
    document.addEventListener('mousedown', onMouse);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onMouse);
      document.removeEventListener('keydown', onKey);
    };
  }, [moreOpen]);

  // Close "More" on navigation
  useEffect(() => { setMoreOpen(false); }, [pathname]);

  const handleLogout = () => { logout(); navigate('/login'); };

  const moreHasActive = moreVisible.some((item) => pathActive(pathname, item.to));
  const customerChrome = !(user?.role === 'admin' || user?.role === 'staff' || user?.role === 'super_admin');

  return (
    <header
      className={`sticky top-0 z-50 border-b backdrop-blur-xl transition-colors dark:border-stone-700/80 dark:bg-stone-950/90 ${
        customerChrome
          ? 'customer-nav-chrome border-[#e0d9d0]/80 bg-[#f7f3ed]/92 backdrop-blur-md dark:border-stone-600/50 dark:bg-stone-950/95'
          : 'border-[#e0d9d0]/80 bg-[#f7f3ed]/95 dark:border-stone-700/80 dark:bg-stone-950/95'
      }`}
    >
      <div className="mx-auto flex h-14 min-h-14 max-w-6xl items-center gap-4 px-4 sm:gap-6 sm:px-6">

        {/* Logo */}
        <Link
          to={isAuthenticated && user?.role === 'super_admin' ? '/platform' : '/'}
          className="group flex shrink-0 items-baseline gap-1.5 rounded-md py-2 pr-1 focus-ring sm:pr-2"
        >
          <span className="font-display text-[1.125rem] font-bold tracking-tight text-[#1c1917] dark:text-stone-50">Salon</span>
          <span className="text-[11px] font-medium tracking-[0.14em] text-[#78716c] dark:text-stone-400">desk</span>
        </Link>

        {/* Desktop nav */}
        {isAuthenticated ? (
          <nav className="hidden min-w-0 flex-1 items-center justify-center gap-1 md:flex" aria-label="Main">
            {primaryVisible.map((item) => (
              <Link key={item.to} to={item.to} className={pathActive(pathname, item.to) ? navLinkActive : navLink}>
                {item.label}
              </Link>
            ))}

            {/* More dropdown */}
            <div className="relative pl-1" ref={moreWrapRef}>
              <button
                type="button"
                onClick={() => setMoreOpen((o) => !o)}
                aria-expanded={moreOpen}
                aria-haspopup="true"
                aria-controls="nav-more-menu"
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-medium tracking-wide transition-colors focus-ring ${
                  moreHasActive || moreOpen
                    ? 'bg-white/90 text-[#1c1917] shadow-[inset_0_-2px_0_0_#b07d62] ring-1 ring-[#e0d9d0] dark:bg-stone-800/90 dark:text-stone-50 dark:ring-stone-600'
                    : 'text-[#78716c] hover:bg-black/[0.035] hover:text-[#1c1917] dark:text-stone-300 dark:hover:bg-stone-800/60'
                }`}
              >
                More
                <ChevronDown aria-hidden className={`h-3.5 w-3.5 shrink-0 opacity-70 transition-transform ${moreOpen ? 'rotate-180' : ''}`} />
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
          <nav className="hidden min-w-0 flex-1 items-center justify-center gap-1 md:flex" aria-label="Explore">
            <Link to="/marketplace" className={navLink}>
              Find a salon
            </Link>
          </nav>
        )}

        {/* Right-side actions */}
        <div className={`flex shrink-0 flex-wrap items-center justify-end gap-2 sm:gap-3 md:gap-4 ${
          isAuthenticated ? 'md:border-l md:border-stone-200/70 md:pl-5 dark:md:border-stone-700/70' : ''
        }`}>
          {isAuthenticated ? (
            <>
              <span className="hidden max-w-[11rem] truncate text-xs leading-snug text-[#78716c] sm:block dark:text-stone-400">
                {user?.name}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-full px-3 py-2 text-xs font-medium text-[#78716c] transition hover:bg-black/[0.04] hover:text-[#1c1917] focus-ring dark:text-stone-400 dark:hover:bg-stone-800/50 dark:hover:text-stone-100"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link
                to="/marketplace"
                className="rounded-md px-2.5 py-2 text-[11px] font-medium text-stone-700 transition hover:bg-stone-200/40 hover:text-stone-900 focus-ring sm:px-3 sm:text-xs dark:text-stone-300 dark:hover:bg-stone-800/50"
              >
                Salons
              </Link>
              <Link
                to="/demo"
                className="inline-flex rounded-md px-2.5 py-2 text-[11px] font-medium text-stone-700 underline decoration-stone-400/70 decoration-1 underline-offset-2 transition-colors hover:text-stone-900 hover:decoration-stone-600 focus-ring sm:px-3 sm:text-xs dark:text-stone-300 dark:decoration-stone-600 dark:hover:text-stone-100"
              >
                Book a demo
              </Link>
              <Link
                to="/login"
                className="rounded-md px-3 py-2 text-xs font-medium text-stone-600 transition hover:bg-stone-200/40 hover:text-stone-900 focus-ring dark:text-stone-300 dark:hover:bg-stone-800/50"
              >
                Sign in
              </Link>
              <Link
                to="/register"
                className="rounded-full border border-[#2d2926] bg-[#2d2926] px-4 py-2 text-xs font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:border-[#231f1c] hover:bg-[#231f1c] focus-ring dark:border-stone-100 dark:bg-stone-100 dark:text-[#1c1917] dark:hover:bg-white"
              >
                Register
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Mobile nav */}
      {isAuthenticated && (
        <MobileNav
          pathname={pathname}
          primaryItems={primaryVisible}
          moreItems={moreVisible}
          customerChrome={customerChrome}
        />
      )}
    </header>
  );
}

// MobileNav 

function MobileNav({
  pathname,
  primaryItems,
  moreItems,
  customerChrome,
}: {
  pathname: string;
  primaryItems: NavItem[];
  moreItems: NavItem[];
  customerChrome: boolean;
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  useEffect(() => { setMoreOpen(false); }, [pathname]);

  const moreHasActive = moreItems.some((i) => pathActive(pathname, i.to));

  return (
    <div className={`border-t md:hidden dark:border-stone-800/80 ${
      customerChrome
        ? 'customer-mobile-nav border-[#e0d9d0]/70 bg-[#f2ede6] dark:border-stone-800 dark:bg-stone-950'
        : 'border-[#e0d9d0]/70 bg-[#f2ede6] dark:bg-stone-950'
    }`}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <nav
          className="flex flex-wrap items-center gap-x-1 gap-y-1 py-2.5 [-webkit-tap-highlight-color:transparent]"
          aria-label="Mobile"
        >
          {primaryItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`whitespace-nowrap rounded-full px-3.5 py-2 text-xs font-medium ${
                pathActive(pathname, item.to)
                  ? 'bg-white/90 text-[#1c1917] shadow-[inset_0_-2px_0_0_#b07d62] ring-1 ring-[#e0d9d0] dark:bg-stone-800 dark:text-stone-50 dark:ring-stone-600'
                  : 'text-[#57534e] hover:bg-black/[0.04] hover:text-[#1c1917] dark:text-stone-300 dark:hover:bg-stone-800/50'
              }`}
            >
              {item.label}
            </Link>
          ))}

          <button
            type="button"
            onClick={() => setMoreOpen((o) => !o)}
            aria-expanded={moreOpen}
            className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-3.5 py-2 text-xs font-medium ${
              moreOpen || moreHasActive
                ? 'bg-white/90 text-[#1c1917] shadow-[inset_0_-2px_0_0_#b07d62] ring-1 ring-[#e0d9d0] dark:bg-stone-800 dark:text-stone-50'
                : 'text-[#57534e] hover:bg-black/[0.04] hover:text-[#1c1917] dark:text-stone-300 dark:hover:bg-stone-800/50'
            }`}
          >
            More
            <ChevronDown aria-hidden className={`h-3 w-3 shrink-0 transition-transform ${moreOpen ? 'rotate-180' : ''}`} />
          </button>
        </nav>

        {moreOpen && (
          <div className="flex flex-col gap-0.5 border-t border-stone-200/60 py-2 pb-3 pl-1 dark:border-stone-800">
            {moreItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMoreOpen(false)}
                className={`rounded-full px-3 py-2.5 text-xs font-medium ${
                  pathActive(pathname, item.to)
                    ? 'bg-white/90 text-[#1c1917] ring-1 ring-[#e0d9d0] dark:bg-stone-800 dark:text-stone-50'
                    : 'text-[#57534e] hover:bg-black/[0.04] hover:text-[#1c1917] dark:text-stone-300 dark:hover:bg-stone-800/40'
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