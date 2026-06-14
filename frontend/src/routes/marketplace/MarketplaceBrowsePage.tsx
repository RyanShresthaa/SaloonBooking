'use client';

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  listMarketplaceSalons,
  type MarketplaceSalonCard,
  type MarketplaceSort,
} from '@/lib/api/marketplace';
import { listPublicPlatformCategories } from '@/lib/api/platformPublic';
import { getApiErrorMessage } from '@/lib/utils/apiError';
import { formatCurrency, CURRENCY_PREFIX } from '@/lib/utils/currency';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { useAuthStore } from '@/store/authStore';

function formatPriceRange(s: MarketplaceSalonCard) {
  const lo = s.priceFrom;
  const hi = s.priceTo;
  if (lo == null && hi == null) return null;
  if (lo != null && hi != null && lo !== hi) return `From ${formatCurrency(lo)} – ${formatCurrency(hi)}`;
  if (lo != null) return `From ${formatCurrency(lo)}`;
  if (hi != null) return `Up to ${formatCurrency(hi)}`;
  return null;
}

function ratingLine(s: MarketplaceSalonCard) {
  if (s.avgRating == null && !(s.reviewCount && s.reviewCount > 0)) return null;
  const parts: string[] = [];
  if (s.avgRating != null) parts.push(`${s.avgRating.toFixed(1)} ★`);
  if (s.reviewCount != null && s.reviewCount > 0) {
    parts.push(`${s.reviewCount} review${s.reviewCount === 1 ? '' : 's'}`);
  }
  return parts.join(' · ');
}

export default function MarketplaceBrowsePage() {
  const { user } = useAuthStore();
  const isSalonDesk = user?.role === 'admin' || user?.role === 'staff';
  const myListingSlug = user?.salonSlug;

  const [salons, setSalons] = useState<MarketplaceSalonCard[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [city, setCity] = useState('');
  const [region, setRegion] = useState('');
  const [q, setQ] = useState('');
  const [serviceQ, setServiceQ] = useState('');
  const [platformCategoryId, setPlatformCategoryId] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minRating, setMinRating] = useState('');
  const [sort, setSort] = useState<MarketplaceSort>('name');

  const { data: categories = [] } = useQuery({
    queryKey: ['public-platform-categories'],
    queryFn: async () => {
      const res = await listPublicPlatformCategories();
      return (res.data.data || []) as { id: string; name: string }[];
    },
  });

  const load = () => {
    setLoading(true);
    setError('');
    const minP = minPrice.trim() === '' ? undefined : Number(minPrice);
    const maxP = maxPrice.trim() === '' ? undefined : Number(maxPrice);
    const minR = minRating.trim() === '' ? undefined : Number(minRating);
    listMarketplaceSalons({
      city: city.trim() || undefined,
      region: region.trim() || undefined,
      q: q.trim() || undefined,
      serviceQ: serviceQ.trim() || undefined,
      platformCategoryId: platformCategoryId.trim() || undefined,
      minPrice: minP != null && !Number.isNaN(minP) ? minP : undefined,
      maxPrice: maxP != null && !Number.isNaN(maxP) ? maxP : undefined,
      minRating: minR != null && !Number.isNaN(minR) ? minR : undefined,
      sort,
      limit: 48,
      offset: 0,
    })
      .then((res) => {
        const d = res.data.data;
        setSalons(d?.salons || []);
        setCount(d?.count ?? 0);
      })
      .catch((err: unknown) => setError(getApiErrorMessage(err, 'Could not load salons.')))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- explicit search via button
  }, []);

  return (
    <div className="page-shell-spacious">
      <header className="page-header">
        <p className="page-eyebrow">Marketplace</p>
        <h1 className="page-title">{isSalonDesk ? 'Salon directory' : 'Find a salon'}</h1>
        <p className="page-lede">
          {isSalonDesk ? (
            <>
              Browse approved listings on the public marketplace — compare services, pricing, and ratings, or spot-check
              how salons present next to yours. Price filters use each listing&apos;s published catalog (amounts in{' '}
              {CURRENCY_PREFIX}); service and category filters match what is bookable.
            </>
          ) : (
            <>
              Browse approved listings, filter by live services and ratings, then open a profile to book. Price filters
              use each salon&apos;s published catalog (amounts in {CURRENCY_PREFIX}); service and category filters match
              what is actually bookable.
            </>
          )}
        </p>
        {isSalonDesk && myListingSlug ? (
          <p className="mt-4 text-sm">
            <Link
              to={`/marketplace/${encodeURIComponent(myListingSlug)}`}
              className="font-semibold text-rose-800 underline decoration-rose-800/35 underline-offset-2 transition hover:text-rose-900 dark:text-rose-300 dark:hover:text-rose-200"
            >
              Open your public listing
            </Link>
          </p>
        ) : null}
      </header>

      <section className="surface-card mb-8 rounded-lg p-6 sm:p-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Input label="City" value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Kathmandu" />
          <Input label="Region / state" value={region} onChange={(e) => setRegion(e.target.value)} placeholder="e.g. Bagmati" />
          <Input label="Search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name or description" />
          <Input
            label="Service contains"
            value={serviceQ}
            onChange={(e) => setServiceQ(e.target.value)}
            placeholder="e.g. Haircut, SPA"
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-stone-700 dark:text-stone-300">Service category</label>
            <select
              value={platformCategoryId}
              onChange={(e) => setPlatformCategoryId(e.target.value)}
              className="rounded-md border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 focus-ring dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
            >
              <option value="">Any category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <Input label={`Min price (${CURRENCY_PREFIX})`} type="number" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} />
          <Input label={`Max price (${CURRENCY_PREFIX})`} type="number" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
          <Input
            label="Min avg. rating"
            type="number"
            step="0.5"
            min={0}
            max={5}
            value={minRating}
            onChange={(e) => setMinRating(e.target.value)}
            placeholder="e.g. 4"
          />
          <div className="flex flex-col gap-1.5 sm:col-span-2 lg:col-span-3">
            <label className="text-[13px] font-medium text-stone-700 dark:text-stone-300">Sort by</label>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as MarketplaceSort)}
              className="rounded-md border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 focus-ring dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
            >
              <option value="name">Name (A–Z)</option>
              <option value="featured">Featured first</option>
              <option value="sponsored">Sponsored first</option>
              <option value="price_asc">Price: lowest first</option>
              <option value="price_desc">Price: highest first</option>
              <option value="rating">Highest rated</option>
              <option value="reviews">Most reviewed</option>
            </select>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button type="button" onClick={load} loading={loading}>
            Search
          </Button>
          <Link
            to="/marketplace/apply"
            className="inline-flex items-center rounded-md border border-stone-300 px-4 py-2 text-sm font-medium text-stone-800 transition hover:bg-stone-50 focus-ring dark:border-stone-600 dark:text-stone-100 dark:hover:bg-stone-800/60"
          >
            List your salon
          </Link>
        </div>
        {error ? <p className="mt-4 text-sm text-red-800">{error}</p> : null}
      </section>

      <p className="mb-4 text-sm text-stone-600 dark:text-stone-400">
        {loading ? 'Loading…' : `${count} listing${count === 1 ? '' : 's'}`}
      </p>

      <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {salons.map((s) => (
          <li key={s.id}>
            <Link
              to={s.slug ? `/marketplace/${encodeURIComponent(s.slug)}` : '#'}
              className="group flex h-full flex-col overflow-hidden rounded-lg border border-stone-200/90 bg-white shadow-sm transition hover:border-rose-200/80 hover:shadow-md dark:border-stone-700 dark:bg-stone-900/80 dark:hover:border-rose-900/50"
            >
              <div className="aspect-[16/9] w-full bg-stone-100 dark:bg-stone-800">
                {s.coverImageUrl ? (
                  <img src={s.coverImageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-stone-400">No cover image</div>
                )}
              </div>
              <div className="flex flex-1 flex-col gap-2 p-4">
                <h2 className="font-display text-lg text-stone-900 group-hover:text-rose-900 dark:text-stone-50 dark:group-hover:text-rose-200">
                  {s.name}
                </h2>
                <p className="line-clamp-2 text-sm text-stone-600 dark:text-stone-400">{s.description}</p>
                {ratingLine(s) ? (
                  <p className="text-xs font-medium text-amber-900 dark:text-amber-200/90">{ratingLine(s)}</p>
                ) : null}
                {s.verified ? (
                  <span className="mt-1 inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100">
                    Verified
                  </span>
                ) : null}
                <p className="mt-auto text-xs text-stone-500 dark:text-stone-500">
                  {[s.city, s.region].filter(Boolean).join(', ') || '\u00a0'}
                </p>
                {formatPriceRange(s) ? (
                  <p className="text-xs font-medium text-rose-800 dark:text-rose-300">{formatPriceRange(s)}</p>
                ) : null}
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {!loading && salons.length === 0 ? (
        <p className="mt-8 text-center text-sm text-stone-600 dark:text-stone-400">No salons match your filters yet.</p>
      ) : null}
    </div>
  );
}
