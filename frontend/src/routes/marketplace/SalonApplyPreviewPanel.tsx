'use client';

import { useId, type ReactNode } from 'react';
import { CheckCircle2, Clock, Mail, MapPin, Phone, Star } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/currency';
import { slugifyBase } from '@/lib/utils/slugify';

type CatalogRow = { name: string; price: string };

function ShimmerLine({ className }: { className?: string }) {
  return <div className={`skeleton-shimmer h-3 ${className ?? ''}`} aria-hidden />;
}

function ShimmerBlock({ className }: { className?: string }) {
  return <div className={`skeleton-shimmer ${className ?? ''}`} aria-hidden />;
}

function StarRowMuted() {
  return (
    <span className="inline-flex items-center gap-0.5 text-stone-300 dark:text-stone-600" aria-hidden>
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} className="h-4 w-4 fill-none" strokeWidth={1.5} />
      ))}
    </span>
  );
}

function buildCatalogPreview(rows: CatalogRow[]) {
  return rows
    .map((r) => ({
      name: r.name.trim(),
      price: Number(String(r.price).replace(/,/g, '')),
    }))
    .filter((r) => r.name.length > 0);
}

function formatAddressPreview(p: {
  addressLine1: string;
  addressLine2: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
}): string {
  const line = [p.addressLine1, p.addressLine2].filter((x) => x.trim()).join(', ');
  const tail = [p.city, p.region].filter((x) => x.trim()).join(', ');
  const zip = [p.postalCode.trim(), p.country.trim().toUpperCase()].filter(Boolean).join(' ');
  return [line, tail, zip].filter(Boolean).join(' · ');
}

function SectionPreview({ title, eyebrow, children }: { title: string; eyebrow?: string; children: ReactNode }) {
  return (
    <section className="border-b border-stone-200/80 pb-6 pt-6 first:pt-0 dark:border-stone-700/70">
      <div className="mb-3">
        {eyebrow ? (
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-500 dark:text-stone-400">{eyebrow}</p>
        ) : null}
        <h2 className="font-display text-base font-semibold tracking-tight text-stone-900 dark:text-stone-50">{title}</h2>
      </div>
      {children}
    </section>
  );
}

export type SalonApplyPreviewPanelProps = {
  name: string;
  description: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
  catalogRows: CatalogRow[];
  amenitiesText: string;
  hoursSummary: string;
  publicPhone: string;
  publicEmail: string;
  websiteUrl: string;
  completionPct: number;
};

export default function SalonApplyPreviewPanel({
  name,
  description,
  addressLine1,
  addressLine2,
  city,
  region,
  postalCode,
  country,
  catalogRows,
  amenitiesText,
  hoursSummary,
  publicPhone,
  publicEmail,
  websiteUrl,
  completionPct,
}: SalonApplyPreviewPanelProps) {
  const barId = useId();
  const slug = slugifyBase(name);
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const previewUrl = slug ? `${origin}/marketplace/${encodeURIComponent(slug)}` : '';
  const services = buildCatalogPreview(catalogRows);
  const amenities = amenitiesText
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const addressLine = formatAddressPreview({
    addressLine1,
    addressLine2,
    city,
    region,
    postalCode,
    country,
  });
  const pct = Math.min(100, Math.max(0, Math.round(completionPct)));

  const btnPrimary =
    'pointer-events-none inline-flex w-full items-center justify-center rounded-lg border border-stone-950 bg-stone-900 px-3 py-2.5 text-xs font-semibold text-stone-50 opacity-90 dark:bg-stone-100 dark:text-stone-900 dark:border-stone-300';
  const btnSecondary =
    'pointer-events-none inline-flex w-full items-center justify-center rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-xs font-semibold text-stone-800 opacity-90 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100';

  const skeletonServiceSlots = Math.max(0, 3 - services.length);

  return (
    <div className="flex flex-col">
      <div className="rounded-xl border border-stone-200/90 bg-[#faf8f5] shadow-sm dark:border-stone-700 dark:bg-stone-950">
        <div className="border-b border-stone-200/80 px-4 py-3 dark:border-stone-700/80">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">Customer page URL</p>
          {previewUrl ? (
            <p className="mt-1 break-all font-mono text-[11px] leading-snug text-rose-900 dark:text-rose-300">{previewUrl}</p>
          ) : (
            <div className="mt-2 space-y-2">
              <ShimmerLine className="w-full max-w-full" />
              <ShimmerLine className="w-4/5" />
            </div>
          )}
        </div>

        <div className="max-h-[min(72vh,640px)] overflow-y-auto overscroll-contain px-3 pb-4 pt-3 sm:px-4">
          <div className="overflow-hidden rounded-lg border border-stone-200/90 bg-stone-100 dark:border-stone-700 dark:bg-stone-900">
            <div className="relative flex aspect-[21/9] min-h-[120px] items-center justify-center bg-gradient-to-br from-stone-200/90 via-stone-100 to-stone-200/70 dark:from-stone-800 dark:via-stone-900 dark:to-stone-800">
              <span className="text-[11px] font-medium text-stone-500 dark:text-stone-500">Photos after approval</span>
            </div>
          </div>

          <div className="mt-4 px-0.5">
            {name.trim() ? (
              <h3 className="font-display text-xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">{name.trim()}</h3>
            ) : (
              <ShimmerBlock className="h-8 w-[min(100%,14rem)]" />
            )}
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <StarRowMuted />
              <span className="text-stone-500 dark:text-stone-400">No reviews yet</span>
            </div>
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-1">
            <div className="min-w-0 px-0.5">
              <SectionPreview title="Services" eyebrow="Menu preview">
                <ul className="divide-y divide-stone-200 rounded-lg border border-stone-200 bg-white dark:divide-stone-700 dark:border-stone-700 dark:bg-stone-900/70">
                  {services.map((svc, i) => (
                    <li
                      key={`${svc.name}-${i}`}
                      className="flex flex-col gap-0.5 px-3 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
                    >
                      <p className="min-w-0 text-sm font-medium text-stone-900 dark:text-stone-100">{svc.name}</p>
                      <p className="shrink-0 text-sm font-semibold text-stone-900 dark:text-stone-50">
                        {Number.isFinite(svc.price) ? formatCurrency(svc.price) : '—'}
                      </p>
                    </li>
                  ))}
                  {Array.from({ length: skeletonServiceSlots }, (_, i) => (
                    <li key={`sk-${i}`} className="px-3 py-3">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <ShimmerLine className="w-[min(100%,12rem)]" />
                        <ShimmerLine className="w-16 sm:ml-auto" />
                      </div>
                    </li>
                  ))}
                </ul>
              </SectionPreview>

              <SectionPreview title="About" eyebrow="Story">
                {description.trim() ? (
                  <p className="whitespace-pre-wrap text-xs leading-relaxed text-stone-700 dark:text-stone-300">{description.trim()}</p>
                ) : (
                  <div className="space-y-2">
                    <ShimmerLine className="w-full" />
                    <ShimmerLine className="w-full" />
                    <ShimmerLine className="w-3/5" />
                  </div>
                )}
              </SectionPreview>

              <SectionPreview title="Opening times" eyebrow="Hours">
                {hoursSummary.trim() ? (
                  <p className="text-xs leading-relaxed text-stone-700 dark:text-stone-300">{hoursSummary.trim()}</p>
                ) : (
                  <div className="space-y-2">
                    <ShimmerLine className="w-full" />
                    <ShimmerLine className="w-4/5" />
                  </div>
                )}
              </SectionPreview>

              {amenities.length > 0 ? (
                <SectionPreview title="Additional information" eyebrow="Good to know">
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {amenities.map((a) => (
                      <li key={a} className="flex items-start gap-2 text-xs text-stone-700 dark:text-stone-300">
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
                        {a}
                      </li>
                    ))}
                  </ul>
                </SectionPreview>
              ) : (
                <SectionPreview title="Additional information" eyebrow="Good to know">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <ShimmerLine className="w-full" />
                    <ShimmerLine className="w-full" />
                  </div>
                </SectionPreview>
              )}
            </div>

            <aside className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-700 dark:bg-stone-900/90">
              {name.trim() ? (
                <p className="font-display text-base font-semibold text-stone-900 dark:text-stone-50">{name.trim()}</p>
              ) : (
                <ShimmerBlock className="h-6 w-32" />
              )}
              <div className="mt-2 text-[11px] text-stone-500 dark:text-stone-400">New on marketplace</div>
              <div className={`${btnPrimary} mt-4`}>Book now</div>
              <div className={`${btnSecondary} mt-2`}>Join waitlist</div>
              <div className="mt-4 space-y-2.5 border-t border-stone-100 pt-4 text-xs text-stone-700 dark:border-stone-800 dark:text-stone-300">
                <div className="flex gap-2">
                  <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-stone-500" aria-hidden />
                  {hoursSummary.trim() ? (
                    <span className="leading-snug">{hoursSummary.trim()}</span>
                  ) : (
                    <ShimmerLine className="mt-0.5 h-3 flex-1" />
                  )}
                </div>
                <div className="flex gap-2">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-stone-500" aria-hidden />
                  {addressLine ? (
                    <span className="leading-snug">{addressLine}</span>
                  ) : (
                    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                      <ShimmerLine className="h-3 w-full" />
                      <ShimmerLine className="h-3 w-2/3" />
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Phone className="mt-0.5 h-3.5 w-3.5 shrink-0 text-stone-500" aria-hidden />
                  {publicPhone.trim() ? (
                    <span>{publicPhone.trim()}</span>
                  ) : (
                    <ShimmerLine className="mt-0.5 h-3 w-28" />
                  )}
                </div>
                <div className="flex gap-2">
                  <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0 text-stone-500" aria-hidden />
                  {publicEmail.trim() ? (
                    <span className="break-all">{publicEmail.trim()}</span>
                  ) : (
                    <ShimmerLine className="mt-0.5 h-3 w-36" />
                  )}
                </div>
                {websiteUrl.trim() ? (
                  <p className="break-all text-[11px] text-rose-800 dark:text-rose-300">{websiteUrl.trim()}</p>
                ) : null}
              </div>
            </aside>
          </div>
        </div>
      </div>

      <div className="mt-4 px-0.5">
        <div className="mb-1.5 flex items-center justify-between gap-2 text-xs font-medium text-stone-700 dark:text-stone-300">
          <label htmlFor={barId} className="tabular-nums">
            Preview completion: {pct}%
          </label>
        </div>
        <div
          id={barId}
          className="h-2 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-800"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Preview completion ${pct} percent`}
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-rose-700 to-amber-600 transition-[width] duration-300 ease-out dark:from-rose-500 dark:to-amber-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
