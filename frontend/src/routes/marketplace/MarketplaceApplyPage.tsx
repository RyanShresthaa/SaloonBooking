'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import AuthGuard from '@/components/layout/AuthGuard';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { applyMarketplaceSalon } from '@/lib/api/marketplace';
import { getApiErrorMessage } from '@/lib/utils/apiError';
import SalonApplyPreviewPanel from '@/routes/marketplace/SalonApplyPreviewPanel';

type CatalogRow = { name: string; price: string };

const emptyRow = (): CatalogRow => ({ name: '', price: '' });

function buildCatalogPayload(rows: CatalogRow[]) {
  return rows
    .map((r) => ({
      name: r.name.trim(),
      price: Number(String(r.price).replace(/,/g, '')),
    }))
    .filter((r) => r.name.length > 0);
}

function computePreviewCompletionPct(
  name: string,
  description: string,
  addressLine1: string,
  city: string,
  catalogRows: CatalogRow[],
  amenitiesText: string,
  hoursSummary: string,
  publicPhone: string,
  publicEmail: string,
): number {
  const servicesCatalog = buildCatalogPayload(catalogRows);
  const amenities = amenitiesText
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const checks = [
    name.trim().length > 0,
    description.trim().length >= 10,
    addressLine1.trim().length > 0,
    city.trim().length > 0,
    servicesCatalog.length >= 1,
    servicesCatalog.length >= 2,
    amenities.length >= 2,
    hoursSummary.trim().length >= 8,
    publicPhone.trim().length > 0,
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(publicEmail.trim()),
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

const STEP_LABELS = ['Salon & location', 'Services & facilities', 'Hours & contact'] as const;

export default function MarketplaceApplyPage() {
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [region, setRegion] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('NP');
  const [publicPhone, setPublicPhone] = useState('');
  const [publicEmail, setPublicEmail] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [catalogRows, setCatalogRows] = useState<CatalogRow[]>([emptyRow(), emptyRow()]);
  const [amenitiesText, setAmenitiesText] = useState('');
  const [hoursSummary, setHoursSummary] = useState('');

  const completionPct = useMemo(
    () =>
      computePreviewCompletionPct(
        name,
        description,
        addressLine1,
        city,
        catalogRows,
        amenitiesText,
        hoursSummary,
        publicPhone,
        publicEmail,
      ),
    [name, description, addressLine1, city, catalogRows, amenitiesText, hoursSummary, publicPhone, publicEmail],
  );

  const previewProps = useMemo(
    () => ({
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
    }),
    [
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
    ],
  );

  const addServiceRow = () => setCatalogRows((prev) => [...prev, emptyRow()]);
  const removeServiceRow = (index: number) => {
    setCatalogRows((prev) => (prev.length <= 2 ? prev : prev.filter((_, i) => i !== index)));
  };
  const setCatalogField = (index: number, field: keyof CatalogRow, value: string) => {
    setCatalogRows((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  };

  const clientValidate = (): string | null => {
    const servicesCatalog = buildCatalogPayload(catalogRows);
    if (servicesCatalog.length < 2) {
      return 'Add at least two services with names and prices (menu guests will see on your card).';
    }
    for (const s of servicesCatalog) {
      if (!Number.isFinite(s.price) || s.price < 0) {
        return 'Each listed service needs a valid price (0 or more, numbers only).';
      }
    }
    const amenities = amenitiesText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (amenities.length < 2) {
      return 'List at least two facilities or amenities, separated by commas (e.g. Wi-Fi, parking, AC).';
    }
    if (!publicPhone.trim()) return 'Public phone is required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(publicEmail.trim())) {
      return 'Enter a valid public email for customers to reach you.';
    }
    if (hoursSummary.trim().length < 8) {
      return 'Describe opening hours with a bit more detail (e.g. Mon–Sat 9:00–19:00).';
    }
    return null;
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const cv = clientValidate();
    if (cv) {
      setError(cv);
      return;
    }
    const servicesCatalog = buildCatalogPayload(catalogRows);
    const amenities = amenitiesText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    setLoading(true);
    try {
      await applyMarketplaceSalon({
        name: name.trim(),
        description: description.trim(),
        addressLine1: addressLine1.trim(),
        addressLine2: addressLine2.trim() || undefined,
        city: city.trim(),
        region: region.trim() || undefined,
        postalCode: postalCode.trim() || undefined,
        country: country.trim() || 'NP',
        publicPhone: publicPhone.trim(),
        publicEmail: publicEmail.trim(),
        websiteUrl: websiteUrl.trim() || undefined,
        servicesCatalog,
        amenities,
        operatingHours: { summary: hoursSummary.trim() },
      });
      setDone(true);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Could not submit application.'));
    } finally {
      setLoading(false);
    }
  };

  const goNext = () => setStep((s) => Math.min(3, s + 1));
  const goBack = () => setStep((s) => Math.max(1, s - 1));

  return (
    <AuthGuard>
      <div className="page-shell-spacious">
        <header className="page-header">
          <p className="page-eyebrow">Marketplace</p>
          <h1 className="page-title">List your salon</h1>
          <p className="page-lede">
            Submit a complete profile for review: services with prices, facilities, hours, and public contact. An
            administrator will approve your listing or request changes before it appears publicly.
          </p>
        </header>

        {done ? (
          <div className="surface-card rounded-lg p-8">
            <p className="text-stone-800 dark:text-stone-200">Thanks — your application is pending review.</p>
            <Link
              to="/marketplace"
              className="mt-4 inline-block text-sm font-medium text-rose-800 underline dark:text-rose-300"
            >
              Back to marketplace
            </Link>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(300px,380px)] lg:items-start lg:gap-10">
            <form onSubmit={onSubmit} className="surface-card min-w-0 space-y-6 rounded-lg p-6 sm:p-8 lg:max-w-none">
              {error ? <p className="text-sm text-red-800 dark:text-red-300">{error}</p> : null}

              <nav aria-label="Application steps" className="space-y-3">
                <ol className="flex flex-wrap gap-2">
                  {STEP_LABELS.map((label, i) => {
                    const n = i + 1;
                    const active = step === n;
                    const doneStep = step > n;
                    return (
                      <li key={label}>
                        <button
                          type="button"
                          onClick={() => {
                            if (doneStep || active) setStep(n);
                          }}
                          disabled={!doneStep && !active}
                          className={`rounded-full border px-3 py-1.5 text-xs font-medium transition focus-ring ${
                            active
                              ? 'border-rose-800 bg-rose-50 text-rose-950 dark:border-rose-400 dark:bg-rose-950/40 dark:text-rose-100'
                              : doneStep
                                ? 'border-stone-300 bg-white text-stone-700 hover:border-stone-400 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-200'
                                : 'cursor-not-allowed border-stone-200 bg-stone-50 text-stone-400 dark:border-stone-700 dark:bg-stone-900/50 dark:text-stone-500'
                          }`}
                        >
                          <span className="tabular-nums">{n}.</span> {label}
                        </button>
                      </li>
                    );
                  })}
                </ol>
                <div className="h-1 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-800">
                  <div
                    className="h-full rounded-full bg-rose-800 transition-[width] duration-300 dark:bg-rose-500"
                    style={{ width: `${(step / 3) * 100}%` }}
                  />
                </div>
              </nav>

              {step === 1 ? (
                <section className="space-y-4">
                  <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Salon & location</h2>
                  <Input label="Salon name" value={name} onChange={(e) => setName(e.target.value)} required />
                  <div className="flex flex-col gap-1.5">
                    <label className="section-label" htmlFor="apply-desc">
                      Description
                    </label>
                    <textarea
                      id="apply-desc"
                      required
                      rows={4}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="resize-y rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus-ring dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
                    />
                  </div>
                  <Input label="Address line 1" value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} required />
                  <Input label="Address line 2 (optional)" value={addressLine2} onChange={(e) => setAddressLine2(e.target.value)} />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input label="City" value={city} onChange={(e) => setCity(e.target.value)} required />
                    <Input label="Region / state" value={region} onChange={(e) => setRegion(e.target.value)} />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input label="Postal code" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
                    <Input label="Country (ISO 2)" value={country} onChange={(e) => setCountry(e.target.value)} maxLength={2} />
                  </div>
                </section>
              ) : null}

              {step === 2 ? (
                <>
                  <section className="space-y-4">
                    <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Services & pricing</h2>
                    <p className="text-xs text-stone-600 dark:text-stone-400">
                      Add at least <strong>two</strong> menu items with prices (used for marketplace price filters and your
                      card until live booking services are linked).
                    </p>
                    <div className="space-y-3">
                      {catalogRows.map((row, index) => (
                        <div key={index} className="grid gap-2 sm:grid-cols-[1fr_120px_auto] sm:items-end">
                          <Input
                            label={index === 0 ? 'Service name' : `Service ${index + 1}`}
                            value={row.name}
                            onChange={(e) => setCatalogField(index, 'name', e.target.value)}
                            placeholder="e.g. Signature haircut"
                          />
                          <Input
                            label="Price (NPR)"
                            type="text"
                            inputMode="decimal"
                            value={row.price}
                            onChange={(e) => setCatalogField(index, 'price', e.target.value)}
                            placeholder="0"
                          />
                          <div className="flex items-end pb-0.5">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={catalogRows.length <= 2}
                              onClick={() => removeServiceRow(index)}
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <Button type="button" variant="secondary" size="sm" onClick={addServiceRow}>
                      + Add another service
                    </Button>
                  </section>

                  <section className="space-y-3">
                    <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Facilities & amenities</h2>
                    <div className="flex flex-col gap-1.5">
                      <label className="section-label" htmlFor="apply-amenities">
                        Comma-separated list (at least two)
                      </label>
                      <textarea
                        id="apply-amenities"
                        required
                        rows={2}
                        value={amenitiesText}
                        onChange={(e) => setAmenitiesText(e.target.value)}
                        placeholder="e.g. Wi-Fi, parking, wheelchair access, card payment"
                        className="resize-y rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus-ring dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
                      />
                    </div>
                  </section>
                </>
              ) : null}

              {step === 3 ? (
                <>
                  <section className="space-y-3">
                    <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Opening hours</h2>
                    <div className="flex flex-col gap-1.5">
                      <label className="section-label" htmlFor="apply-hours">
                        Typical hours customers should expect
                      </label>
                      <textarea
                        id="apply-hours"
                        required
                        rows={2}
                        value={hoursSummary}
                        onChange={(e) => setHoursSummary(e.target.value)}
                        placeholder="e.g. Mon–Sat 9:00–19:00, Sun closed"
                        className="resize-y rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus-ring dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
                      />
                    </div>
                  </section>

                  <section className="space-y-4">
                    <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Public contact</h2>
                    <Input label="Public phone" type="tel" value={publicPhone} onChange={(e) => setPublicPhone(e.target.value)} required />
                    <Input label="Public email" type="email" value={publicEmail} onChange={(e) => setPublicEmail(e.target.value)} required />
                    <Input label="Website URL (optional)" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} />
                  </section>

                  <details className="group mt-2 overflow-hidden rounded-xl border border-stone-200 bg-[#faf8f5] dark:border-stone-700 dark:bg-stone-900/40 lg:hidden">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-semibold text-stone-900 focus-ring dark:text-stone-100 [&::-webkit-details-marker]:hidden">
                      <span>Preview your page</span>
                      <ChevronDown
                        className="h-4 w-4 shrink-0 text-stone-500 transition-transform duration-200 group-open:rotate-180 dark:text-stone-400"
                        aria-hidden
                      />
                    </summary>
                    <div className="border-t border-stone-200/90 p-4 dark:border-stone-700/90">
                      <SalonApplyPreviewPanel {...previewProps} />
                    </div>
                  </details>
                </>
              ) : null}

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-200/80 pt-4 dark:border-stone-700/80">
                <div className="flex flex-wrap gap-2">
                  {step > 1 ? (
                    <Button type="button" variant="secondary" onClick={goBack}>
                      Back
                    </Button>
                  ) : null}
                  {step < 3 ? (
                    <Button type="button" onClick={goNext}>
                      Next
                    </Button>
                  ) : (
                    <Button type="submit" loading={loading}>
                      Submit application
                    </Button>
                  )}
                </div>
                <Link
                  to="/marketplace"
                  className="inline-flex items-center rounded-md border border-stone-300 px-4 py-2.5 text-sm font-medium text-stone-800 hover:bg-stone-50 focus-ring dark:border-stone-600 dark:text-stone-100 dark:hover:bg-stone-800/60"
                >
                  Cancel
                </Link>
              </div>
            </form>

            <aside className="sticky top-24 hidden min-w-0 lg:block" aria-label="Live page preview">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">Live preview</p>
              <SalonApplyPreviewPanel {...previewProps} />
            </aside>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
