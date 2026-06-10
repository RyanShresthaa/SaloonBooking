import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getDashboardSummary } from '@/lib/api/dashboard';
import AuthGuard from '@/components/layout/AuthGuard';
import { getApiErrorMessage } from '@/lib/utils/apiError';
import { useAuthStore } from '@/store/authStore';
import { Skeleton } from '@/components/ui/Skeleton';

interface Summary {
  appointmentsToday: number;
  upcomingWeek: number;
  pendingAppointments: number;
  vipUpcoming: number;
  waitlistPending: number;
  retailLowStock?: number;
  averageVisitRating?: number | null;
  loyaltyPoints?: number;
}

function StatCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="surface-card rounded-lg p-5 transition-shadow duration-200 hover:shadow-md dark:hover:shadow-stone-900/40">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500 dark:text-stone-400">{label}</p>
      <p className="mt-2 font-display text-3xl text-stone-900 dark:text-stone-50">{value}</p>
      {hint ? <p className="mt-2 text-xs leading-relaxed text-stone-600 dark:text-stone-400">{hint}</p> : null}
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const isSalonWide = user?.role === 'admin' || user?.role === 'staff';

  const {
    data,
    isLoading: loading,
    error: queryError,
  } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: async () => {
      const res = await getDashboardSummary();
      return res.data.data as Summary;
    },
  });

  const error = queryError ? getApiErrorMessage(queryError, 'Could not load dashboard.') : '';

  const skeletonCards = useMemo(
    () =>
      Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="surface-card rounded-lg p-5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-3 h-9 w-16" />
        </div>
      )),
    []
  );

  return (
    <AuthGuard>
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="border-b border-stone-300/50 pb-8 dark:border-stone-600/50">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-500 dark:text-stone-400">Overview</p>
          <h1 className="font-display text-3xl text-stone-900 dark:text-stone-50 sm:text-4xl">Dashboard</h1>
          <p className="mt-2 text-sm text-stone-600 dark:text-stone-300">
            {isSalonWide
              ? 'Quick read on bookings, waitlist, retail stock, and guest satisfaction.'
              : 'Your bookings, waitlist, and loyalty at a glance.'}
          </p>
        </header>

        {error ? (
          <div className="rounded-md border border-red-200/90 bg-red-50/90 px-4 py-3 text-sm text-red-900">{error}</div>
        ) : null}

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" role="status" aria-label="Loading dashboard">
            {skeletonCards}
          </div>
        ) : data ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard label="Today (bookings)" value={data.appointmentsToday} />
            <StatCard label="Next 7 days (active)" value={data.upcomingWeek} hint="Excludes completed & cancelled." />
            <StatCard label="Pending confirmation" value={data.pendingAppointments} />
            <StatCard label="VIP on the horizon" value={data.vipUpcoming} />
            <StatCard label="Waitlist (open)" value={data.waitlistPending} />
            {!isSalonWide && data.loyaltyPoints != null ? (
              <StatCard
                label="Loyalty points"
                value={data.loyaltyPoints}
                hint="You earn points when the salon marks a visit completed."
              />
            ) : null}
            {isSalonWide && data.retailLowStock != null ? (
              <StatCard
                label="Retail low stock"
                value={data.retailLowStock}
                hint="SKUs at or below minimum quantity."
              />
            ) : null}
            {isSalonWide && data.averageVisitRating != null ? (
              <StatCard
                label="Avg. visit rating"
                value={data.averageVisitRating.toFixed(1)}
                hint="Rolling average from guest feedback."
              />
            ) : null}
            <div className="surface-muted rounded-lg border-stone-200/80 p-5 sm:col-span-2 lg:col-span-3 dark:border-stone-700/80">
              <p className="text-sm font-medium text-stone-800 dark:text-stone-100">Shortcuts</p>
              <div className="mt-3 flex flex-wrap gap-3 text-sm">
                <Link to="/appointments" className="link-quiet font-semibold">
                  Appointments
                </Link>
                <Link to="/appointments/new" className="link-quiet font-semibold">
                  New booking
                </Link>
                <Link to="/account" className="link-quiet font-semibold">
                  Account
                </Link>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </AuthGuard>
  );
}
