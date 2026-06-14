import { useLayoutEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import gsap from 'gsap';
import type { LucideIcon } from 'lucide-react';
import {
  Award,
  CalendarDays,
  CalendarRange,
  Crown,
  Hourglass,
  Inbox,
  Package,
  Sparkles,
  Star,
  Users,
} from 'lucide-react';
import { getDashboardSummary } from '@/lib/api/dashboard';
import AuthGuard from '@/components/layout/AuthGuard';
import Button from '@/components/ui/Button';
import { getApiErrorMessage } from '@/lib/utils/apiError';
import { useAuthStore } from '@/store/authStore';
import { Skeleton } from '@/components/ui/Skeleton';
import { customerMotion } from '@/config/customerMotion';

// ─── Constants ───

const SKELETON_CARD_COUNT = 6;

const SHORTCUT_TILE_CLASS =
  'group relative flex flex-col gap-2 overflow-hidden rounded-[10px] border border-[#e0d9d0] bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.05)] transition-[border-color,box-shadow,transform] duration-300 motion-safe:hover:-translate-y-0.5 motion-safe:hover:scale-[1.01] motion-safe:hover:shadow-[0_14px_36px_-20px_rgba(0,0,0,0.14)] dark:border-stone-600 dark:bg-stone-900/75 dark:shadow-[0_2px_16px_rgba(0,0,0,0.25)]';

// ─── Types ───

interface SpotlightAppointment {
  id: string;
  customerName: string;
  appointmentDate: string;
  startTime: string;
  status: string;
  isVip: boolean;
  serviceName: string | null;
  staffName: string | null;
}

interface Summary {
  appointmentsToday: number;
  upcomingWeek: number;
  pendingAppointments: number;
  vipUpcoming: number;
  waitlistPending: number;
  retailLowStock?: number;
  averageVisitRating?: number | null;
  loyaltyPoints?: number;
  spotlightAppointments?: SpotlightAppointment[];
}

// ─── Helpers ───

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// ─── Components ───

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
}) {
  return (
    <div className="surface-card group relative overflow-hidden rounded-[10px] border border-[#e0d9d0] border-l-[3px] border-l-[#b07d62] p-5 pl-[1.15rem] transition-[transform,box-shadow,border-color] duration-300 motion-safe:hover:scale-[1.02] motion-safe:hover:shadow-[0_12px_36px_-20px_rgba(0,0,0,0.12)] dark:border-stone-600 dark:border-l-[#c49a82]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#78716c] dark:text-stone-400">{label}</p>
          <p className="font-display mt-3 text-[2.25rem] font-semibold leading-[0.95] tracking-[-0.02em] text-[#1c1917] tabular-nums dark:text-stone-50 sm:text-[2.45rem]">
            {value}
          </p>
        </div>
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#b07d62]/[0.11] text-[#9d6b52] ring-1 ring-[#b07d62]/20 dark:bg-[#b07d62]/15 dark:text-[#e8c4b0]"
          aria-hidden
        >
          <Icon className="h-5 w-5" strokeWidth={1.5} />
        </div>
      </div>
      {hint ? <p className="mt-3 text-xs leading-relaxed text-[#78716c] dark:text-stone-400">{hint}</p> : null}
    </div>
  );
}

// ─── Exports ───

export default function DashboardPage() {
  const { user } = useAuthStore();
  const isSalonWide = user?.role === 'admin' || user?.role === 'staff';
  const dashAnimRef = useRef<HTMLDivElement>(null);

  const {
    data,
    isLoading: loading,
    isFetching,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: async () => {
      const res = await getDashboardSummary();
      return res.data.data as Summary;
    },
  });

  const error = queryError ? getApiErrorMessage(queryError, 'Could not load dashboard.') : '';

  useLayoutEffect(() => {
    const skipMotion = isSalonWide || loading || !data || prefersReducedMotion();
    const el = dashAnimRef.current;
    if (skipMotion || !el) return;

    const nodes = el.querySelectorAll<HTMLElement>('.surface-card, .surface-muted');
    if (!nodes.length) return;

    const ctx = gsap.context(() => {
      gsap.killTweensOf(nodes);
      gsap.fromTo(
        nodes,
        {
          autoAlpha: 0,
          y: customerMotion.dashboard.yFrom,
          scale: customerMotion.dashboard.scaleFrom,
        },
        {
          autoAlpha: 1,
          y: 0,
          scale: 1,
          duration: customerMotion.dashboard.duration,
          stagger: customerMotion.dashboard.stagger,
          ease: customerMotion.dashboard.ease,
        },
      );
    }, el);

    return () => {
      ctx.revert();
    };
  }, [isSalonWide, loading, data]);

  const skeletonCards = useMemo(
    () =>
      Array.from({ length: SKELETON_CARD_COUNT }).map((_, i) => (
        <div key={i} className="surface-card rounded-[10px] border border-[#e0d9d0] p-5 dark:border-stone-600">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-3 h-9 w-16" />
        </div>
      )),
    [],
  );

  const shortcuts = useMemo(() => {
    if (isSalonWide) {
      return [
        { to: '/appointments', label: 'Appointments', hint: 'Diary & quick status', icon: CalendarDays },
        { to: '/appointments/new', label: 'New booking', hint: 'Desk or walk-in', icon: Sparkles },
        { to: '/account', label: 'Account', hint: 'Profile & preferences', icon: Users },
      ];
    }
    return [
      { to: '/appointments', label: 'Appointments', hint: 'Diary & quick status', icon: CalendarDays },
      {
        to: '/marketplace',
        label: 'Book a visit',
        hint: 'Choose a salon, then pick a time',
        icon: Sparkles,
      },
      { to: '/account', label: 'Account', hint: 'Notes, theme, export', icon: Users },
      { to: '/waitlist', label: 'Waitlist', hint: 'Join or track requests', icon: Inbox },
      { to: '/reviews', label: 'Reviews', hint: 'Your visit feedback', icon: Star },
    ];
  }, [isSalonWide]);

  return (
    <AuthGuard>
      <div className="page-shell">
        <header className="page-header-row">
          <div>
            <p className="page-eyebrow">{isSalonWide ? 'Salon overview' : 'Your salon'}</p>
            <h1 className="page-title">Overview</h1>
            <p className="page-lede">
              {isSalonWide
                ? 'Numbers, next visits on the books, and one-tap jumps to the tools you use most.'
                : 'Your bookings, waitlist, and loyalty — with the next visits surfaced up front.'}
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            loading={isFetching && !loading}
            onClick={() => void refetch()}
            className="shrink-0 rounded-full border-[#e0d9d0] bg-white text-[#1c1917] shadow-[0_1px_3px_rgba(0,0,0,0.05)] hover:border-[#cfc4b8] hover:bg-[#faf8f5] dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
          >
            <span className="text-base leading-none opacity-80" aria-hidden>
              ↻
            </span>
            Refresh
          </Button>
        </header>

        {error ? (
          <div className="rounded-md border border-red-200/90 bg-red-50/90 px-4 py-3 text-sm text-red-900 dark:border-red-900/40 dark:bg-red-950/35 dark:text-red-100">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" role="status" aria-label="Loading dashboard">
            {skeletonCards}
          </div>
        ) : data ? (
          <div ref={dashAnimRef} data-defer-route-stagger className="customer-dash-animate space-y-8">
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Summary statistics">
              <StatCard label="Today (bookings)" value={data.appointmentsToday} icon={CalendarDays} />
              <StatCard
                label="Next 7 days (active)"
                value={data.upcomingWeek}
                hint="Excludes completed & cancelled."
                icon={CalendarRange}
              />
              <StatCard label="Pending confirmation" value={data.pendingAppointments} icon={Hourglass} />
              <StatCard label="VIP on the horizon" value={data.vipUpcoming} icon={Crown} />
              <StatCard label="Waitlist (open)" value={data.waitlistPending} icon={Inbox} />
              {!isSalonWide ? (
                <StatCard
                  label="Loyalty points"
                  value={data.loyaltyPoints ?? 0}
                  hint="You earn points when the salon marks a visit completed."
                  icon={Award}
                />
              ) : null}
              {isSalonWide && data.retailLowStock != null ? (
                <StatCard
                  label="Retail low stock"
                  value={data.retailLowStock}
                  hint="SKUs at or below minimum quantity."
                  icon={Package}
                />
              ) : null}
              {isSalonWide && data.averageVisitRating != null ? (
                <StatCard
                  label="Avg. visit rating"
                  value={data.averageVisitRating.toFixed(1)}
                  hint="Rolling average from guest feedback."
                  icon={Star}
                />
              ) : null}
            </section>

            <section
              className="surface-card rounded-[10px] border border-[#e0d9d0] p-5 sm:p-6 dark:border-stone-600"
              aria-label="Upcoming appointments"
            >
              <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#e0d9d0] pb-4 dark:border-stone-700/70">
                <div>
                  <p className="section-label">Next on the books</p>
                  <p className="mt-1 text-xs leading-relaxed text-[#78716c] dark:text-stone-400">
                    Soonest active visits (not cancelled or completed). Opens the edit sheet for tweaks.
                  </p>
                </div>
                <Link
                  to="/appointments"
                  className="text-xs font-semibold text-[#1c1917] underline decoration-[#b07d62]/45 underline-offset-[3px] transition hover:decoration-[#b07d62] dark:text-stone-200"
                >
                  Full diary →
                </Link>
              </div>
              {data.spotlightAppointments && data.spotlightAppointments.length > 0 ? (
                <ul className="mt-4 divide-y divide-[#e0d9d0]/90 dark:divide-stone-700/80" aria-label="Upcoming appointments list">
                  {data.spotlightAppointments.map((row) => (
                    <li key={row.id}>
                      <Link
                        to={`/appointments/${row.id}/edit`}
                        className="-mx-2 flex flex-wrap items-center justify-between gap-2 rounded-md px-2 py-3 text-sm transition-colors first:pt-1 hover:bg-[#faf8f5]/95 dark:hover:bg-stone-800/40"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-stone-900 dark:text-stone-100">
                            {row.customerName}
                            {row.isVip ? (
                              <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300">
                                VIP
                              </span>
                            ) : null}
                          </p>
                          <p className="mt-0.5 text-xs text-stone-600 dark:text-stone-400">
                            {[row.serviceName, isSalonWide ? row.staffName : null].filter(Boolean).join(' · ') || '—'}
                          </p>
                        </div>
                        <div className="shrink-0 text-right tabular-nums">
                          <p className="font-medium text-stone-800 dark:text-stone-200">
                            {row.appointmentDate} · {row.startTime}
                          </p>
                          <p className="text-[11px] capitalize text-stone-500 dark:text-stone-400">{row.status}</p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-5 text-sm leading-relaxed text-[#78716c] dark:text-stone-400">
                  {isSalonWide ? (
                    <>
                      No upcoming visits in this view.{' '}
                      <Link
                        to="/appointments/new"
                        className="font-semibold text-[#b07d62] underline decoration-[#b07d62]/40 underline-offset-[3px] transition hover:text-[#9d6b52] hover:decoration-[#b07d62] dark:text-[#d4a990]"
                      >
                        Add a booking
                      </Link>
                      {' '}
                      or open the diary.
                    </>
                  ) : (
                    <>
                      Nothing yet — your first booking is one click away.{' '}
                      <Link
                        to="/marketplace"
                        className="font-semibold text-[#b07d62] underline decoration-[#b07d62]/40 underline-offset-[3px] transition hover:text-[#9d6b52] hover:decoration-[#b07d62] dark:text-[#d4a990]"
                      >
                        Find a salon
                      </Link>
                    </>
                  )}
                </p>
              )}
            </section>

            <section aria-label="Shortcuts">
              <p className="section-label">Shortcuts</p>
              <p className="mt-1 text-xs text-[#78716c] dark:text-stone-400">
                {isSalonWide
                  ? 'Core desk actions — use the bar for waitlist, reviews, retail, templates, and bulk email.'
                  : 'Frequent destinations from your account.'}
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {shortcuts.map(({ to, label, hint, icon: Icon }) => (
                  <Link key={to} to={to} className={SHORTCUT_TILE_CLASS}>
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#b07d62]/[0.09] text-[#9d6b52] ring-1 ring-[#b07d62]/15 transition group-hover:bg-[#b07d62]/13 dark:text-[#e8c4b0]">
                      <Icon className="h-5 w-5" strokeWidth={1.5} aria-hidden />
                    </div>
                    <span className="font-display text-[1.05rem] font-medium tracking-tight text-[#1c1917] dark:text-stone-50">
                      {label}
                    </span>
                    <span className="text-xs leading-snug text-[#78716c] dark:text-stone-400">{hint}</span>
                  </Link>
                ))}
              </div>
            </section>
          </div>
        ) : null}
      </div>
    </AuthGuard>
  );
}
