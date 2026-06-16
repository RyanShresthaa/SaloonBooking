'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  getMarketplaceSalonBySlug,
  listSalonReviewsBySlug,
  type MarketplaceSalonDetail,
  type SalonPublicReview,
} from '@/lib/api/marketplace';
import { listPublicPlatformCategories, type PlatformServiceCategory } from '@/lib/api/platformPublic';
import { getApiErrorMessage } from '@/lib/utils/apiError';
import { useAuthStore } from '@/store/authStore';
import { formatCurrency } from '@/lib/utils/currency';
import {
  CheckCircle2,
  Clock,
  Heart,
  Mail,
  MapPin,
  Phone,
  Share2,
  Star,
  Globe,
  X,
} from 'lucide-react';

const btnPrimary =
  'inline-flex w-full items-center justify-center rounded-lg border border-stone-950 bg-stone-900 px-4 py-3 text-sm font-semibold text-stone-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)] transition hover:bg-stone-800 focus-ring dark:bg-stone-100 dark:text-stone-900 dark:border-stone-300 dark:hover:bg-white';

const btnSecondary =
  'inline-flex w-full items-center justify-center rounded-lg border border-stone-300 bg-white px-4 py-3 text-sm font-semibold text-stone-800 transition hover:bg-stone-50 focus-ring dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100 dark:hover:bg-stone-800/80';

const pill =
  'inline-flex shrink-0 items-center rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition focus-ring';

const pillInactive =
  'border-stone-200 bg-white text-stone-700 hover:border-stone-300 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-200';

const pillActive =
  'border-stone-900 bg-stone-900 text-white dark:border-stone-100 dark:bg-stone-100 dark:text-stone-900';

type PublicService = {
  id: string;
  name: string;
  description?: string | null;
  duration: number;
  price: number;
  discountPrice?: number | null;
  platformCategoryId?: string | null;
};

type StaffHighlight = {
  name?: string;
  title?: string | null;
  bio?: string | null;
  photoUrl?: string | null;
};

const DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
const DAY_LABEL: Record<(typeof DAY_ORDER)[number], string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
};

function todayKey(): (typeof DAY_ORDER)[number] {
  const i = new Date().getDay();
  const map: Record<number, (typeof DAY_ORDER)[number]> = {
    0: 'sun',
    1: 'mon',
    2: 'tue',
    3: 'wed',
    4: 'thu',
    5: 'fri',
    6: 'sat',
  };
  return map[i] ?? 'mon';
}

function normalizeMediaUrls(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item === 'string' && item.trim()) out.push(item.trim());
    else if (item && typeof item === 'object' && typeof (item as { url?: string }).url === 'string') {
      const u = (item as { url: string }).url.trim();
      if (u) out.push(u);
    }
  }
  return [...new Set(out)];
}

/** Street lines separate from locality; last line is city, region · postal · country. */
function formatSalonAddressLines(salon: {
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  region?: string | null;
  postalCode?: string | null;
  country?: string | null;
}): string[] {
  const lines: string[] = [];
  const a1 = String(salon.addressLine1 || '').trim();
  const a2 = String(salon.addressLine2 || '').trim();
  if (a1) lines.push(a1);
  if (a2) lines.push(a2);
  const locality = [salon.city, salon.region]
    .map((x) => String(x || '').trim())
    .filter(Boolean)
    .join(', ');
  const zip = String(salon.postalCode || '').trim();
  const cc = String(salon.country || '').trim().toUpperCase();
  const tail = [locality, zip, cc].filter(Boolean);
  if (tail.length) lines.push(tail.join(' · '));
  return lines;
}

function parseStaffHighlights(raw: unknown): StaffHighlight[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((x) => (x && typeof x === 'object' ? (x as StaffHighlight) : null))
    .filter((x): x is StaffHighlight => Boolean(x?.name && String(x.name).trim()));
}

function parseAmenities(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((x) => String(x).trim()).filter(Boolean);
}

function formatDayHours(v: unknown): string {
  if (!v || typeof v !== 'object') return '—';
  const o = v as { closed?: boolean; open?: string; close?: string };
  if (o.closed) return 'Closed';
  if (o.open && o.close) return `${o.open} – ${o.close}`;
  return '—';
}

function operatingHoursDisplay(oh: unknown): { summary?: string; rows: { label: string; hours: string; highlight: boolean }[] } {
  if (!oh || typeof oh !== 'object') return { rows: [] };
  const o = oh as Record<string, unknown>;
  if (typeof o.summary === 'string' && o.summary.trim()) {
    return { summary: o.summary.trim(), rows: [] };
  }
  const t = todayKey();
  return {
    rows: DAY_ORDER.map((key) => ({
      label: DAY_LABEL[key],
      hours: formatDayHours(o[key]),
      highlight: key === t,
    })),
  };
}

function StarRow({ rating }: { rating: number }) {
  const full = Math.round(rating);
  return (
    <span className="inline-flex items-center gap-0.5 text-amber-500" aria-hidden>
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} className={`h-4 w-4 ${i < full ? 'fill-current' : 'fill-none'}`} strokeWidth={1.5} />
      ))}
    </span>
  );
}

function Section({
  id,
  title,
  eyebrow,
  right,
  children,
}: {
  id?: string;
  title: string;
  eyebrow?: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} className="border-b border-stone-200/90 pb-10 pt-10 first:pt-0 dark:border-stone-700/80">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          {eyebrow ? <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500 dark:text-stone-400">{eyebrow}</p> : null}
          <h2 className="font-display text-xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">{title}</h2>
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

export default function SalonProfilePage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [salon, setSalon] = useState<MarketplaceSalonDetail | null>(null);
  const [services, setServices] = useState<PublicService[]>([]);
  const [categories, setCategories] = useState<PlatformServiceCategory[]>([]);
  const [reviews, setReviews] = useState<SalonPublicReview[]>([]);
  const [reviewTotal, setReviewTotal] = useState(0);
  const [reviewFetchLimit, setReviewFetchLimit] = useState(12);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeCategoryId, setActiveCategoryId] = useState<string>('all');
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [servicesExpanded, setServicesExpanded] = useState(false);
  const [saved, setSaved] = useState(false);
  const [toast, setToast] = useState('');

  const STORAGE_KEY = 'salon_saved_slugs';

  useEffect(() => {
    if (!slug) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const arr = JSON.parse(raw || '[]') as string[];
      setSaved(Array.isArray(arr) && arr.includes(slug));
    } catch {
      setSaved(false);
    }
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    Promise.all([getMarketplaceSalonBySlug(slug, { includeServices: true }), listPublicPlatformCategories()])
      .then(([salonRes, catRes]) => {
        if (cancelled) return;
        const data = salonRes.data.data as MarketplaceSalonDetail & { services?: PublicService[] };
        const { services: svcList, ...salonFields } = data;
        setSalon(salonFields);
        setServices(Array.isArray(svcList) ? svcList : []);
        setCategories((catRes.data.data || []) as PlatformServiceCategory[]);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(getApiErrorMessage(err, 'Salon not found or unavailable.'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  /** Canonical slug from API (server may resolve legacy URL slugs). */
  useEffect(() => {
    if (!salon?.slug || !slug) return;
    const pathSlug = decodeURIComponent(slug);
    if (pathSlug !== salon.slug) {
      navigate(`/marketplace/${encodeURIComponent(salon.slug)}`, { replace: true });
    }
  }, [salon?.slug, slug, navigate]);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    listSalonReviewsBySlug(slug, { limit: reviewFetchLimit, offset: 0 })
      .then((revRes) => {
        if (cancelled) return;
        const rd = revRes.data.data;
        setReviews(rd?.reviews || []);
        setReviewTotal(rd?.count ?? 0);
      })
      .catch(() => {
        if (!cancelled) {
          setReviews([]);
          setReviewTotal(0);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [slug, reviewFetchLimit]);

  const categoryNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of categories) m.set(c.id, c.name);
    return m;
  }, [categories]);

  const serviceTabs = useMemo(() => {
    const ids = new Set<string>();
    for (const s of services) {
      if (s.platformCategoryId) ids.add(s.platformCategoryId);
    }
    const tabs: { id: string; label: string }[] = [{ id: 'all', label: 'All services' }];
    for (const id of ids) {
      tabs.push({ id, label: categoryNameById.get(id) || 'Services' });
    }
    return tabs;
  }, [services, categoryNameById]);

  const filteredServices = useMemo(() => {
    if (activeCategoryId === 'all') return services;
    return services.filter((s) => s.platformCategoryId === activeCategoryId);
  }, [services, activeCategoryId]);

  const visibleServices = useMemo(() => {
    const cap = servicesExpanded ? filteredServices.length : Math.min(8, filteredServices.length);
    return filteredServices.slice(0, cap);
  }, [filteredServices, servicesExpanded]);

  const staff = useMemo(() => parseStaffHighlights(salon?.staffHighlights), [salon?.staffHighlights]);
  const amenities = useMemo(() => parseAmenities(salon?.amenities), [salon?.amenities]);
  const hoursBlock = useMemo(() => operatingHoursDisplay(salon?.operatingHours), [salon?.operatingHours]);

  const heroImages = useMemo(() => {
    if (!salon) return [];
    const gallery = normalizeMediaUrls(salon.galleryImages);
    const primary = salon.coverImageUrl?.trim() || '';
    const merged = primary ? [primary, ...gallery.filter((u) => u !== primary)] : gallery;
    return merged.slice(0, 8);
  }, [salon]);

  const toggleSaved = useCallback(() => {
    if (!slug) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = JSON.parse(raw || '[]');
      const arr = new Set<string>(Array.isArray(parsed) ? parsed : []);
      const was = arr.has(slug);
      if (was) arr.delete(slug);
      else arr.add(slug);
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...arr]));
      setSaved(!was);
      setToast(!was ? 'Saved to this browser.' : 'Removed from saved.');
      window.setTimeout(() => setToast(''), 2200);
    } catch {
      /* ignore */
    }
  }, [slug]);

  const handleShare = useCallback(async () => {
    if (!salon) return;
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: salon.name, url });
      } else {
        await navigator.clipboard.writeText(url);
        setToast('Link copied to clipboard.');
        window.setTimeout(() => setToast(''), 2200);
      }
    } catch {
      try {
        await navigator.clipboard.writeText(url);
        setToast('Link copied to clipboard.');
        window.setTimeout(() => setToast(''), 2200);
      } catch {
        /* ignore */
      }
    }
  }, [salon]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-stone-800 dark:border-stone-600 dark:border-t-stone-200" />
      </div>
    );
  }

  if (error || !salon) {
    return (
      <div className="page-shell-spacious">
        <p className="text-sm text-red-800 dark:text-red-300">
          {error || 'Salon not found.'} If you opened a bookmark or link with an old slug, open the{' '}
          <Link to="/marketplace" className="font-medium underline">
            marketplace
          </Link>{' '}
          and choose the salon again.
        </p>
        <Link to="/marketplace" className="mt-4 inline-block text-sm font-medium text-rose-800 underline dark:text-rose-300">
          Back to marketplace
        </Link>
      </div>
    );
  }

  const bookHref = `/appointments/new?salonId=${encodeURIComponent(salon.id)}`;
  const waitHref = `/waitlist?salonId=${encodeURIComponent(salon.id)}`;
  const addressLines = formatSalonAddressLines(salon);
  const rating = salon.avgRating ?? null;
  const reviewCount = salon.reviewCount ?? reviewTotal;

  const social = salon.socialLinks && typeof salon.socialLinks === 'object' ? (salon.socialLinks as Record<string, string>) : {};

  const canEditThisSalon =
    user &&
    (user.role === 'admin' || user.role === 'staff') &&
    user.salonId &&
    String(user.salonId) === String(salon.id);

  return (
    <div className="min-h-screen bg-[#faf8f5] pb-24 dark:bg-stone-950 lg:pb-12">
      {toast ? (
        <div className="fixed bottom-20 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-stone-900 px-4 py-2 text-xs font-medium text-white shadow-lg dark:bg-stone-100 dark:text-stone-900 lg:bottom-8">
          {toast}
        </div>
      ) : null}

      {galleryOpen ? (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black/85 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal
          aria-label="All photos"
        >
          <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-3 pb-3 text-white">
            <p className="text-sm font-semibold">All images</p>
            <button type="button" onClick={() => setGalleryOpen(false)} className="rounded-full p-2 hover:bg-white/10 focus-ring" aria-label="Close">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="mx-auto grid max-h-[calc(100vh-5rem)] w-full max-w-4xl flex-1 auto-rows-fr grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
            {heroImages.map((src) => (
              <button key={src} type="button" onClick={() => setGalleryOpen(false)} className="relative overflow-hidden rounded-lg focus-ring">
                <img src={src} alt="" className="h-40 w-full object-cover sm:h-48" />
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        {canEditThisSalon ? (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200/90 bg-amber-50/90 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
            <span>You are viewing your salon&apos;s public page. Story, hours, gallery, and contact can be updated anytime.</span>
            <Link
              to="/marketplace/my-listing"
              className="shrink-0 rounded-md bg-stone-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-stone-800 dark:bg-amber-100 dark:text-stone-900 dark:hover:bg-white"
            >
              Edit public listing
            </Link>
          </div>
        ) : null}
        <nav className="mb-6 text-xs text-stone-500 dark:text-stone-400" aria-label="Breadcrumb">
          <ol className="flex flex-wrap gap-1.5">
            <li>
              <Link to="/" className="hover:text-stone-800 dark:hover:text-stone-200">
                Home
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li>
              <Link to="/marketplace" className="hover:text-stone-800 dark:hover:text-stone-200">
                Marketplace
              </Link>
            </li>
            {salon.city ? (
              <>
                <li aria-hidden>/</li>
                <li className="text-stone-700 dark:text-stone-300">{salon.city}</li>
              </>
            ) : null}
            <li aria-hidden>/</li>
            <li className="font-medium text-stone-900 dark:text-stone-100">{salon.name}</li>
          </ol>
        </nav>

        {/* Title + actions */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="font-display text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl dark:text-stone-50">{salon.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
              {rating != null ? (
                <a href="#reviews" className="inline-flex items-center gap-2 text-rose-800 hover:underline dark:text-rose-300">
                  <StarRow rating={rating} />
                  <span className="font-semibold tabular-nums">{rating.toFixed(1)}</span>
                  <span className="text-stone-600 dark:text-stone-400">
                    ({reviewCount} review{reviewCount === 1 ? '' : 's'})
                  </span>
                </a>
              ) : (
                <span className="text-stone-500 dark:text-stone-400">No reviews yet</span>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={toggleSaved}
              className={`rounded-full border p-2.5 transition focus-ring ${
                saved
                  ? 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-200'
                  : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-300'
              }`}
              aria-label={saved ? 'Remove from saved' : 'Save salon'}
            >
              <Heart className={`h-5 w-5 ${saved ? 'fill-current' : ''}`} strokeWidth={1.5} />
            </button>
            <button
              type="button"
              onClick={handleShare}
              className="rounded-full border border-stone-200 bg-white p-2.5 text-stone-600 transition hover:border-stone-300 focus-ring dark:border-stone-600 dark:bg-stone-900 dark:text-stone-300"
              aria-label="Share"
            >
              <Share2 className="h-5 w-5" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Hero gallery */}
        <div className="mb-10 overflow-hidden rounded-xl border border-stone-200/90 bg-stone-100 shadow-sm dark:border-stone-700 dark:bg-stone-900">
          {heroImages.length === 0 ? (
            <div className="flex h-56 items-center justify-center text-sm text-stone-500 dark:text-stone-400">No photos yet</div>
          ) : heroImages.length === 1 ? (
            <div className="relative aspect-[21/9] min-h-[200px] max-h-[420px]">
              <img src={heroImages[0]} alt="" className="h-full w-full object-cover" />
            </div>
          ) : (
            <div
              className="grid grid-cols-1 gap-1 sm:min-h-[min(72vw,440px)] sm:grid-cols-2 sm:[grid-template-rows:minmax(0,1fr)_minmax(0,1fr)] lg:min-h-[min(52vw,500px)] lg:grid-cols-3 lg:[grid-template-rows:minmax(0,1fr)_minmax(0,1fr)]"
            >
              {/* Primary: span full height of mosaic — fill cell (no aspect lock) so no gap under image */}
              <div className="relative aspect-[16/10] min-h-[200px] sm:col-span-1 sm:row-span-2 sm:aspect-auto sm:min-h-0 sm:h-full lg:col-span-2 lg:row-span-2">
                <img
                  src={heroImages[0]}
                  alt=""
                  className="h-full w-full object-cover sm:absolute sm:inset-0 sm:h-full sm:w-full"
                />
              </div>
              {heroImages[1] ? (
                <div className="relative hidden aspect-[16/10] min-h-[140px] sm:block sm:aspect-auto sm:min-h-0 sm:h-full">
                  <img
                    src={heroImages[1]}
                    alt=""
                    className="h-full w-full object-cover sm:absolute sm:inset-0 sm:h-full sm:w-full"
                  />
                </div>
              ) : null}
              {heroImages[2] ? (
                <div className="relative hidden aspect-[16/10] min-h-[140px] sm:block sm:aspect-auto sm:min-h-0 sm:h-full">
                  <img src={heroImages[2]} alt="" className="h-full w-full object-cover sm:absolute sm:inset-0 sm:h-full sm:w-full" />
                  {heroImages.length > 3 ? (
                    <button
                      type="button"
                      onClick={() => setGalleryOpen(true)}
                      className="absolute inset-0 flex items-center justify-center bg-black/45 text-sm font-semibold text-white transition hover:bg-black/55 focus-ring"
                    >
                      See all images ({heroImages.length})
                    </button>
                  ) : null}
                </div>
              ) : heroImages.length > 1 ? (
                <button
                  type="button"
                  onClick={() => setGalleryOpen(true)}
                  className="relative hidden min-h-[140px] items-center justify-center bg-stone-800/90 text-sm font-semibold text-white sm:flex sm:min-h-0 sm:h-full"
                >
                  See all images
                </button>
              ) : null}
            </div>
          )}
          {heroImages.length > 1 && heroImages.length < 3 ? (
            <div className="border-t border-stone-200/80 bg-white px-3 py-2 text-center dark:border-stone-700 dark:bg-stone-900">
              <button type="button" onClick={() => setGalleryOpen(true)} className="text-sm font-semibold text-rose-800 underline dark:text-rose-300">
                See all images
              </button>
            </div>
          ) : null}
        </div>

        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-12">
          {/* Main column */}
          <div className="min-w-0">
            {serviceTabs.length > 1 ? (
              <div className="mb-4 flex gap-2 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch]">
                {serviceTabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveCategoryId(tab.id)}
                    className={`${pill} ${activeCategoryId === tab.id ? pillActive : pillInactive}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            ) : null}

            <Section
              title="Services"
              eyebrow="Book online"
              right={
                filteredServices.length > 8 ? (
                  <button type="button" onClick={() => setServicesExpanded((e) => !e)} className="text-sm font-semibold text-rose-800 underline dark:text-rose-300">
                    {servicesExpanded ? 'Show less' : 'See all'}
                  </button>
                ) : null
              }
            >
              {visibleServices.length === 0 ? (
                <p className="text-sm text-stone-600 dark:text-stone-400">No services in this category.</p>
              ) : (
                <ul className="divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white dark:divide-stone-700 dark:border-stone-700 dark:bg-stone-900/70">
                  {visibleServices.map((svc) => {
                    const discounted =
                      svc.discountPrice != null && Number(svc.discountPrice) > 0 && Number(svc.discountPrice) < Number(svc.price);
                    return (
                      <li key={svc.id} className="flex flex-col gap-1 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-stone-900 dark:text-stone-100">{svc.name}</p>
                          {svc.description ? (
                            <p className="mt-1 text-sm leading-relaxed text-stone-600 dark:text-stone-400">{svc.description}</p>
                          ) : null}
                          <p className="mt-2 text-xs text-stone-500 dark:text-stone-500">{svc.duration} min</p>
                        </div>
                        <div className="shrink-0 text-left sm:text-right">
                          {discounted ? (
                            <p className="text-sm">
                              <span className="text-stone-400 line-through">{formatCurrency(svc.price)}</span>
                              <span className="ml-2 font-semibold text-stone-900 dark:text-stone-50">
                                from {formatCurrency(svc.discountPrice!)}
                              </span>
                            </p>
                          ) : (
                            <p className="text-sm font-semibold text-stone-900 dark:text-stone-50">from {formatCurrency(svc.price)}</p>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Section>

            {staff.length > 0 ? (
              <Section
                title="Team"
                right={
                  <Link to={bookHref} className="text-sm font-semibold text-rose-800 underline dark:text-rose-300">
                    Book with team
                  </Link>
                }
              >
                <ul className="flex gap-4 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch]">
                  {staff.map((m, idx) => (
                    <li key={`${m.name}-${idx}`} className="w-[104px] shrink-0 text-center">
                      <div className="mx-auto h-20 w-20 overflow-hidden rounded-full border border-stone-200 bg-stone-100 dark:border-stone-600 dark:bg-stone-800">
                        {m.photoUrl ? <img src={m.photoUrl} alt="" className="h-full w-full object-cover" /> : null}
                      </div>
                      <p className="mt-2 text-xs font-semibold text-stone-900 dark:text-stone-100">{m.name}</p>
                      {m.title ? <p className="text-[11px] text-stone-500 dark:text-stone-400">{m.title}</p> : null}
                    </li>
                  ))}
                </ul>
              </Section>
            ) : null}

            <Section
              id="reviews"
              title="Reviews"
              eyebrow="Guests"
              right={
                reviewTotal > reviews.length ? (
                  <button
                    type="button"
                    className="text-sm font-semibold text-rose-800 underline dark:text-rose-300"
                    onClick={() => setReviewFetchLimit((n) => Math.min(n + 12, 50))}
                  >
                    See more
                  </button>
                ) : null
              }
            >
              {reviews.length === 0 ? (
                <p className="text-sm text-stone-600 dark:text-stone-400">No published reviews yet.</p>
              ) : (
                <>
                  {rating != null ? (
                    <div className="mb-6 flex items-center gap-3">
                      <StarRow rating={rating} />
                      <span className="text-2xl font-semibold tabular-nums text-stone-900 dark:text-stone-50">{rating.toFixed(1)}</span>
                      <span className="text-sm text-stone-600 dark:text-stone-400">from {reviewTotal} reviews</span>
                    </div>
                  ) : null}
                  <ul className="space-y-4">
                    {reviews.map((r) => (
                      <li key={r.id} className="rounded-xl border border-stone-200 bg-white p-4 dark:border-stone-700 dark:bg-stone-900/70">
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-100 text-sm font-semibold text-rose-900 dark:bg-rose-900/40 dark:text-rose-100">
                            {(r.author?.name || 'G').slice(0, 1).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-baseline justify-between gap-2">
                              <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">{r.author?.name || 'Guest'}</p>
                              <time className="text-xs text-stone-500 dark:text-stone-400" dateTime={r.createdAt}>
                                {new Date(r.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                              </time>
                            </div>
                            <div className="mt-1 text-amber-500">
                              <StarRow rating={r.rating} />
                            </div>
                            {r.title ? <p className="mt-2 text-sm font-medium text-stone-800 dark:text-stone-200">{r.title}</p> : null}
                            {r.body ? <p className="mt-1 text-sm leading-relaxed text-stone-600 dark:text-stone-400">{r.body}</p> : null}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </Section>

            <Section title="About" eyebrow="Story">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-stone-700 dark:text-stone-300">{salon.description}</p>
            </Section>

            {hoursBlock.summary || hoursBlock.rows.length > 0 ? (
              <Section title="Opening times" eyebrow="Hours">
                {hoursBlock.summary ? (
                  <p className="text-sm leading-relaxed text-stone-700 dark:text-stone-300">{hoursBlock.summary}</p>
                ) : (
                  <ul className="max-w-md space-y-2 text-sm">
                    {hoursBlock.rows.map((row) => (
                      <li key={row.label} className="flex justify-between gap-4 border-b border-stone-100 py-2 last:border-0 dark:border-stone-800">
                        <span className={row.highlight ? 'font-semibold text-emerald-800 dark:text-emerald-300' : 'text-stone-700 dark:text-stone-300'}>
                          {row.highlight ? <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 align-middle" aria-hidden /> : null}
                          {row.label}
                        </span>
                        <span className="tabular-nums text-stone-600 dark:text-stone-400">{row.hours}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>
            ) : null}

            {(amenities.length > 0 || Object.keys(social).some((k) => social[k])) ? (
              <Section title="Additional information" eyebrow="Good to know">
                <ul className="grid gap-3 sm:grid-cols-2">
                  {amenities.map((a) => (
                    <li key={a} className="flex items-start gap-2 text-sm text-stone-700 dark:text-stone-300">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
                      {a}
                    </li>
                  ))}
                  {social.instagram ? (
                    <li className="flex items-start gap-2 text-sm">
                      <Globe className="mt-0.5 h-4 w-4 shrink-0 text-stone-500" aria-hidden />
                      <a href={social.instagram} target="_blank" rel="noreferrer" className="text-rose-800 underline dark:text-rose-300">
                        Instagram
                      </a>
                    </li>
                  ) : null}
                  {social.facebook ? (
                    <li className="flex items-start gap-2 text-sm">
                      <Globe className="mt-0.5 h-4 w-4 shrink-0 text-stone-500" aria-hidden />
                      <a href={social.facebook} target="_blank" rel="noreferrer" className="text-rose-800 underline dark:text-rose-300">
                        Facebook
                      </a>
                    </li>
                  ) : null}
                </ul>
              </Section>
            ) : null}
          </div>

          {/* Sticky booking card */}
          <aside className="lg:sticky lg:top-20">
            <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.12)] dark:border-stone-700 dark:bg-stone-900/90">
              <p className="font-display text-lg font-semibold text-stone-900 dark:text-stone-50">{salon.name}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {salon.verified ? (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-900 dark:bg-emerald-900/35 dark:text-emerald-100">
                    Verified
                  </span>
                ) : null}
                {salon.featuredRank != null && salon.featuredRank > 0 ? (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900 dark:bg-amber-900/40 dark:text-amber-100">
                    Featured
                  </span>
                ) : null}
              </div>
              {rating != null ? (
                <div className="mt-3 flex items-center gap-2 text-sm">
                  <StarRow rating={rating} />
                  <span className="font-semibold tabular-nums">{rating.toFixed(1)}</span>
                  <span className="text-stone-500 dark:text-stone-400">({reviewCount})</span>
                </div>
              ) : null}

              <Link to={bookHref} className={`${btnPrimary} mt-5`}>
                Book now
              </Link>
              <Link to={waitHref} className={`${btnSecondary} mt-2`}>
                Join waitlist
              </Link>

              <div className="mt-6 space-y-3 border-t border-stone-100 pt-5 text-sm text-stone-700 dark:border-stone-800 dark:text-stone-300">
                <div className="flex gap-2">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0 text-stone-500" aria-hidden />
                  <span>Check opening times below for today&apos;s hours.</span>
                </div>
                <div className="flex gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-stone-500" aria-hidden />
                  <address className="min-w-0 not-italic leading-snug">
                    {addressLines.length ? (
                      addressLines.map((line, i) => (
                        <span key={i} className="block">
                          {line}
                        </span>
                      ))
                    ) : (
                      <span className="block">Address on file</span>
                    )}
                  </address>
                </div>
                {salon.publicPhone ? (
                  <div className="flex gap-2">
                    <Phone className="mt-0.5 h-4 w-4 shrink-0 text-stone-500" aria-hidden />
                    <a href={`tel:${salon.publicPhone}`} className="text-rose-800 underline dark:text-rose-300">
                      {salon.publicPhone}
                    </a>
                  </div>
                ) : null}
                {salon.publicEmail ? (
                  <div className="flex gap-2">
                    <Mail className="mt-0.5 h-4 w-4 shrink-0 text-stone-500" aria-hidden />
                    <a href={`mailto:${salon.publicEmail}`} className="break-all text-rose-800 underline dark:text-rose-300">
                      {salon.publicEmail}
                    </a>
                  </div>
                ) : null}
                {salon.websiteUrl ? (
                  <div className="flex gap-2">
                    <Globe className="mt-0.5 h-4 w-4 shrink-0 text-stone-500" aria-hidden />
                    <a href={salon.websiteUrl} target="_blank" rel="noreferrer" className="break-all text-rose-800 underline dark:text-rose-300">
                      Website
                    </a>
                  </div>
                ) : null}
              </div>
            </div>

            <p className="mt-4 text-center text-xs text-stone-500 dark:text-stone-500">
              <Link to="/marketplace" className="font-medium text-rose-800 underline dark:text-rose-300">
                ← Back to marketplace
              </Link>
            </p>
          </aside>
        </div>
      </div>

      {/* Mobile book bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-stone-200 bg-[#faf8f5]/95 p-3 backdrop-blur-md dark:border-stone-700 dark:bg-stone-950/95 lg:hidden">
        <Link to={bookHref} className={btnPrimary}>
          Book now
        </Link>
      </div>
    </div>
  );
}
