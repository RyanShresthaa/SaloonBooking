'use client';

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthGuard from '@/components/layout/AuthGuard';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/axios';

type Analytics = {
  salons: number;
  customers: number;
  staffAndAdmins: number;
  appointments: number;
  publishedReviews: number;
  auditLogRows: number;
};

export default function PlatformDashboardPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [data, setData] = useState<Analytics | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (user && user.role !== 'super_admin') {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    if (user?.role !== 'super_admin') return;
    api
      .get('/platform/analytics')
      .then((res) => setData(res.data.data as Analytics))
      .catch(() => setErr('Could not load platform analytics.'));
  }, [user?.role]);

  if (!user || user.role !== 'super_admin') {
    return (
      <AuthGuard>
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-stone-800" />
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="page-shell-spacious">
        <header className="page-header">
          <p className="page-eyebrow">Platform</p>
          <h1 className="page-title">Super admin</h1>
          <p className="page-lede">
            Marketplace-wide controls, catalog, banners, and analytics. Salon teams use the desk app; tenant admins use
            Listings for their own scope.
          </p>
        </header>

        {err ? <p className="text-sm text-red-800">{err}</p> : null}

        {data ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(
              [
                ['Salons', data.salons],
                ['Customers', data.customers],
                ['Staff & admins', data.staffAndAdmins],
                ['Appointments', data.appointments],
                ['Published reviews', data.publishedReviews],
                ['Audit rows', data.auditLogRows],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="surface-card rounded-lg p-5">
                <p className="text-xs font-medium uppercase tracking-wide text-stone-500">{label}</p>
                <p className="mt-2 font-display text-3xl text-stone-900 dark:text-stone-50">{value}</p>
              </div>
            ))}
          </div>
        ) : (
          !err && (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-stone-800" />
            </div>
          )
        )}

        <section className="mt-10 grid gap-4 sm:grid-cols-2">
          <Link
            to="/admin/marketplace"
            className="surface-card rounded-lg p-5 text-sm font-medium text-rose-900 underline decoration-rose-400/80 hover:text-rose-950 dark:text-rose-200"
          >
            Moderate marketplace listings (approve / reject / featured)
          </Link>
          <p className="surface-card rounded-lg p-5 text-sm text-stone-600 dark:text-stone-400">
            Categories & banners: use API <code className="text-xs">GET/PATCH /api/platform/categories</code> and{' '}
            <code className="text-xs">/api/platform/banners</code> with a super admin token, or extend this page when you
            want full UI forms.
          </p>
        </section>
      </div>
    </AuthGuard>
  );
}
