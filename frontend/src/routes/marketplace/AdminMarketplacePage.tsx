'use client';

import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthGuard from '@/components/layout/AuthGuard';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import {
  adminDeleteMarketplaceListing,
  adminGetMarketplaceListing,
  adminListMarketplace,
  adminModerateMarketplace,
} from '@/lib/api/marketplace';
import { getApiErrorMessage } from '@/lib/utils/apiError';
import { useAuthStore } from '@/store/authStore';

type ListingStatus = 'pending' | 'approved' | 'rejected' | 'changes_requested';

type AdminRow = {
  id: string;
  name: string;
  listingStatus: string;
  city?: string | null;
  slug?: string | null;
};

const STATUSES: (ListingStatus | 'all')[] = ['all', 'pending', 'approved', 'rejected', 'changes_requested'];

function canAccessListings(role: string | undefined) {
  return role === 'admin' || role === 'super_admin';
}

/** Backend only allows approve/reject/delete for this role (see AdminMarketplaceController). */
function canModerateListings(role: string | undefined) {
  return role === 'super_admin';
}

export default function AdminMarketplacePage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [rows, setRows] = useState<AdminRow[]>([]);
  const [count, setCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState<(typeof STATUSES)[number]>('pending');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState('');
  const [notes, setNotes] = useState('');
  const [slugOverride, setSlugOverride] = useState('');
  const [acting, setActing] = useState(false);

  const loadList = useCallback(() => {
    setLoadingList(true);
    setError('');
    adminListMarketplace({
      status: statusFilter === 'all' ? undefined : statusFilter,
      limit: 50,
      offset: 0,
    })
      .then((res) => {
        const d = res.data.data as { rows?: AdminRow[]; count?: number };
        setRows((d.rows || []) as AdminRow[]);
        setCount(d.count ?? 0);
      })
      .catch((err: unknown) => setError(getApiErrorMessage(err, 'Could not load listings.')))
      .finally(() => setLoadingList(false));
  }, [statusFilter]);

  useEffect(() => {
    if (!canAccessListings(user?.role)) return;
    loadList();
  }, [user?.role, loadList]);

  useEffect(() => {
    if (user && !canAccessListings(user.role)) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const loadDetail = (id: string) => {
    setSelectedId(id);
    setLoadingDetail(true);
    setDetail(null);
    setNotes('');
    setSlugOverride('');
    adminGetMarketplaceListing(id)
      .then((res) => {
        setDetail(res.data.data as Record<string, unknown>);
        const s = (res.data.data as { slug?: string | null })?.slug;
        setSlugOverride(s ? String(s) : '');
      })
      .catch((err: unknown) => setError(getApiErrorMessage(err, 'Could not load listing.')))
      .finally(() => setLoadingDetail(false));
  };

  const moderate = async (listingStatus: ListingStatus) => {
    if (!selectedId) return;
    setActing(true);
    setError('');
    try {
      await adminModerateMarketplace(selectedId, {
        listingStatus,
        adminReviewNotes: notes.trim() || undefined,
        slug: listingStatus === 'approved' && slugOverride.trim() ? slugOverride.trim() : undefined,
      });
      await loadList();
      loadDetail(selectedId);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Update failed.'));
    } finally {
      setActing(false);
    }
  };

  const remove = async () => {
    if (!selectedId) return;
    if (!window.confirm('Delete this marketplace listing? This cannot be undone.')) return;
    setActing(true);
    setError('');
    try {
      await adminDeleteMarketplaceListing(selectedId);
      setSelectedId(null);
      setDetail(null);
      await loadList();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Delete failed.'));
    } finally {
      setActing(false);
    }
  };

  if (!user || !canAccessListings(user.role)) {
    return (
      <AuthGuard>
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-stone-800" />
        </div>
      </AuthGuard>
    );
  }

  const isPlatformModerator = canModerateListings(user.role);

  return (
    <AuthGuard>
      <div className="page-shell-spacious">
        <header className="page-header">
          <p className="page-eyebrow">Admin</p>
          <h1 className="page-title">Marketplace listings</h1>
          <p className="page-lede">Review applications, set status, optional slug on approve, or remove a listing.</p>
        </header>

        {user.role === 'admin' ? (
          <p className="mb-4 rounded-lg border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/35 dark:text-amber-100">
            As a <strong>salon admin</strong>, this queue only shows your linked salon listing and applications{' '}
            <strong>you</strong> submitted — not every owner on the platform. To approve other salons, sign in as a{' '}
            <strong>super_admin</strong> (set <code className="rounded bg-amber-100/80 px-1 text-xs dark:bg-amber-900/60">role</code>{' '}
            in the database for your account, or use a dedicated platform user).
          </p>
        ) : null}

        {error ? <p className="mb-4 text-sm text-red-800">{error}</p> : null}

        <div className="mb-6 flex flex-wrap gap-2">
          {STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium capitalize ${
                statusFilter === s
                  ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900'
                  : 'border border-stone-300 text-stone-700 hover:bg-stone-50 dark:border-stone-600 dark:text-stone-300 dark:hover:bg-stone-800/60'
              }`}
            >
              {s.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <section className="surface-card rounded-lg p-4 sm:p-6">
            <h2 className="font-display text-lg text-stone-900 dark:text-stone-50">Queue</h2>
            <p className="mt-1 text-xs text-stone-600 dark:text-stone-400">
              {loadingList ? 'Loading…' : `${count} total`}
            </p>
            <ul className="mt-4 max-h-[28rem] divide-y divide-stone-200 overflow-y-auto dark:divide-stone-700">
              {rows.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => loadDetail(r.id)}
                    className={`flex w-full flex-col items-start gap-0.5 px-2 py-3 text-left text-sm transition hover:bg-stone-50 dark:hover:bg-stone-800/50 ${
                      selectedId === r.id ? 'bg-stone-100 dark:bg-stone-800/80' : ''
                    }`}
                  >
                    <span className="font-medium text-stone-900 dark:text-stone-100">{r.name}</span>
                    <span className="text-xs text-stone-600 dark:text-stone-400">
                      {r.listingStatus}
                      {r.city ? ` · ${r.city}` : ''}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            {!loadingList && rows.length === 0 ? (
              <p className="mt-4 text-sm text-stone-600 dark:text-stone-400">No rows for this filter.</p>
            ) : null}
          </section>

          <section className="surface-card rounded-lg p-4 sm:p-6">
            <h2 className="font-display text-lg text-stone-900 dark:text-stone-50">Detail</h2>
            {!selectedId ? (
              <p className="mt-4 text-sm text-stone-600 dark:text-stone-400">Select a listing.</p>
            ) : loadingDetail ? (
              <div className="mt-6 flex justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-stone-800" />
              </div>
            ) : detail ? (
              <div className="mt-4 space-y-4 text-sm">
                <p>
                  <span className="font-medium text-stone-900 dark:text-stone-100">Status</span>:{' '}
                  {String(detail.listingStatus)}
                </p>
                <p>
                  <span className="font-medium text-stone-900 dark:text-stone-100">Slug</span>:{' '}
                  {detail.slug ? String(detail.slug) : '—'}
                </p>
                <p className="whitespace-pre-wrap text-stone-700 dark:text-stone-300">{String(detail.description || '')}</p>
                <Input
                  label="Admin notes (optional)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={!isPlatformModerator}
                />
                <Input
                  label="Slug override (approve only)"
                  value={slugOverride}
                  onChange={(e) => setSlugOverride(e.target.value)}
                  placeholder="leave blank to auto-generate"
                  disabled={!isPlatformModerator}
                />
                {isPlatformModerator ? (
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button type="button" size="sm" loading={acting} onClick={() => moderate('approved')}>
                      Approve
                    </Button>
                    <Button type="button" size="sm" variant="secondary" loading={acting} onClick={() => moderate('pending')}>
                      Pending
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      loading={acting}
                      onClick={() => moderate('changes_requested')}
                    >
                      Request changes
                    </Button>
                    <Button type="button" size="sm" variant="danger" loading={acting} onClick={() => moderate('rejected')}>
                      Reject
                    </Button>
                    <Button type="button" size="sm" variant="ghost" loading={acting} onClick={remove}>
                      Delete
                    </Button>
                  </div>
                ) : (
                  <p className="rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-600 dark:border-stone-600 dark:bg-stone-900/60 dark:text-stone-400">
                    Approve, reject, and delete are limited to <strong>super_admin</strong> in the API. Use a super admin
                    account on this page to moderate platform-wide applications.
                  </p>
                )}
              </div>
            ) : null}
          </section>
        </div>

        <p className="mt-8 text-center text-xs text-stone-500">
          <Link to="/marketplace" className="underline">
            View public marketplace
          </Link>
        </p>
      </div>
    </AuthGuard>
  );
}
