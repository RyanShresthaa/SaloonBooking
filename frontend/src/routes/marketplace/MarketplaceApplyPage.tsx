'use client';

import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import AuthGuard from '@/components/layout/AuthGuard';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { applyMarketplaceSalon } from '@/lib/api/marketplace';
import { getApiErrorMessage } from '@/lib/utils/apiError';

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

export default function MarketplaceApplyPage() {
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
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
          <form onSubmit={onSubmit} className="surface-card max-w-2xl space-y-6 rounded-lg p-6 sm:p-8">
            {error ? <p className="text-sm text-red-800">{error}</p> : null}

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

            <div className="flex flex-wrap gap-3 pt-2">
              <Button type="submit" loading={loading}>
                Submit application
              </Button>
              <Link
                to="/marketplace"
                className="inline-flex items-center rounded-md border border-stone-300 px-4 py-2.5 text-sm font-medium text-stone-800 hover:bg-stone-50 focus-ring dark:border-stone-600 dark:text-stone-100 dark:hover:bg-stone-800/60"
              >
                Cancel
              </Link>
            </div>
          </form>
        )}
      </div>
    </AuthGuard>
  );
}
