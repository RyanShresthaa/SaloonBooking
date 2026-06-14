'use client';

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthGuard from '@/components/layout/AuthGuard';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { getTenantMarketplaceListing, patchTenantMarketplaceListing } from '@/lib/api/marketplace';
import { getApiErrorMessage } from '@/lib/utils/apiError';
import { useAuthStore } from '@/store/authStore';

function linesToArray(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

function safeJsonParse<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export default function MarketplaceMyListingPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const salonSlug = user?.salonSlug;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [region, setRegion] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('NP');
  const [province, setProvince] = useState('');
  const [district, setDistrict] = useState('');
  const [publicPhone, setPublicPhone] = useState('');
  const [publicEmail, setPublicEmail] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [operatingHoursJson, setOperatingHoursJson] = useState('{}');
  const [amenitiesText, setAmenitiesText] = useState('');
  const [galleryText, setGalleryText] = useState('');
  const [staffJson, setStaffJson] = useState('[]');
  const [socialJson, setSocialJson] = useState('{}');

  useEffect(() => {
    if (user && user.role !== 'admin' && user.role !== 'staff') {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    if (!user || (user.role !== 'admin' && user.role !== 'staff')) return;
    let c = false;
    setLoading(true);
    setError('');
    getTenantMarketplaceListing()
      .then((res) => {
        if (c) return;
        const row = res.data.data as Record<string, unknown>;
        setName(String(row.name || ''));
        setDescription(String(row.description || ''));
        setAddressLine1(String(row.addressLine1 || ''));
        setAddressLine2(String(row.addressLine2 || ''));
        setCity(String(row.city || ''));
        setRegion(String(row.region || ''));
        setPostalCode(String(row.postalCode || ''));
        setCountry(String(row.country || 'NP'));
        setProvince(String(row.province || ''));
        setDistrict(String(row.district || ''));
        setPublicPhone(String(row.publicPhone || ''));
        setPublicEmail(String(row.publicEmail || ''));
        setWebsiteUrl(String(row.websiteUrl || ''));
        setCoverImageUrl(String(row.coverImageUrl || ''));
        setLogoUrl(String(row.logoUrl || ''));
        setOperatingHoursJson(JSON.stringify(row.operatingHours ?? {}, null, 2));
        const am = row.amenities;
        setAmenitiesText(Array.isArray(am) ? (am as string[]).join('\n') : '');
        const gal = row.galleryImages;
        setGalleryText(Array.isArray(gal) ? (gal as string[]).join('\n') : '');
        setStaffJson(JSON.stringify(row.staffHighlights ?? [], null, 2));
        setSocialJson(JSON.stringify(row.socialLinks ?? {}, null, 2));
      })
      .catch((err: unknown) => setError(getApiErrorMessage(err, 'Could not load your public listing.')))
      .finally(() => {
        if (!c) setLoading(false);
      });
    return () => {
      c = true;
    };
  }, [user]);

  const onSave = async () => {
    setSaving(true);
    setError('');
    setOk('');
    try {
      const parsedHours = safeJsonParse(operatingHoursJson.trim(), {});
      const operatingHours =
        parsedHours && typeof parsedHours === 'object' && !Array.isArray(parsedHours) && Object.keys(parsedHours).length > 0
          ? parsedHours
          : { summary: "Hours — message us for today's slots." };

      const body: Record<string, unknown> = {
        name: name.trim(),
        description: description.trim(),
        addressLine1: addressLine1.trim(),
        addressLine2: addressLine2.trim() || null,
        city: city.trim(),
        region: region.trim() || null,
        postalCode: postalCode.trim() || null,
        country: (country.trim() || 'NP').slice(0, 2).toUpperCase(),
        province: province.trim() || null,
        district: district.trim() || null,
        publicPhone: publicPhone.trim() || null,
        publicEmail: publicEmail.trim() || null,
        websiteUrl: websiteUrl.trim() || null,
        coverImageUrl: coverImageUrl.trim() || null,
        logoUrl: logoUrl.trim() || null,
        operatingHours,
        amenities: linesToArray(amenitiesText),
        galleryImages: linesToArray(galleryText),
        staffHighlights: safeJsonParse(staffJson, []),
        socialLinks: safeJsonParse(socialJson, {}),
      };

      await patchTenantMarketplaceListing(body);
      setOk('Saved. Your public profile updates immediately (slug and approval status are managed by the platform).');
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Could not save.'));
    } finally {
      setSaving(false);
    }
  };

  const publicHref = salonSlug ? `/marketplace/${encodeURIComponent(salonSlug)}` : '/marketplace';

  return (
    <AuthGuard>
      <div className="mx-auto max-w-3xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500 dark:text-stone-400">Marketplace</p>
        <h1 className="font-display mt-1 text-2xl font-semibold text-stone-900 dark:text-stone-50">Edit public listing</h1>
        <p className="mt-2 text-sm leading-relaxed text-stone-600 dark:text-stone-400">
          This is your customer-facing page on the directory. Slug and moderation status are controlled by platform admins; everything
          below is yours to keep fresh.
        </p>
        <p className="mt-2 text-sm">
          <Link to={publicHref} className="font-semibold text-rose-800 underline dark:text-rose-300">
            View public page →
          </Link>
        </p>

        {loading ? (
          <p className="mt-8 text-sm text-stone-600 dark:text-stone-400">Loading…</p>
        ) : (
          <form
            className="mt-8 space-y-6"
            onSubmit={(e) => {
              e.preventDefault();
              void onSave();
            }}
          >
            {error ? <p className="text-sm text-red-800 dark:text-red-300">{error}</p> : null}
            {ok ? <p className="text-sm text-emerald-800 dark:text-emerald-300">{ok}</p> : null}

            <Input label="Salon name" value={name} onChange={(e) => setName(e.target.value)} required />
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-stone-700 dark:text-stone-300">About (public story)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={10}
                required
                className="min-h-[200px] w-full rounded-md border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 focus-ring dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
              />
            </div>

            <p className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">Location (Nepal)</p>
            <Input label="Address line 1" value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} required />
            <Input label="Address line 2 (landmark / floor)" value={addressLine2} onChange={(e) => setAddressLine2(e.target.value)} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="City / municipality" value={city} onChange={(e) => setCity(e.target.value)} required />
              <Input label="Province" value={region} onChange={(e) => setRegion(e.target.value)} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Postal code" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
              <Input label="Country (ISO-2)" value={country} onChange={(e) => setCountry(e.target.value)} maxLength={2} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Province (metadata)" value={province} onChange={(e) => setProvince(e.target.value)} placeholder="e.g. Bagmati Province" />
              <Input label="District" value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="e.g. Kathmandu" />
            </div>

            <p className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">Contact</p>
            <Input label="Public phone" value={publicPhone} onChange={(e) => setPublicPhone(e.target.value)} />
            <Input label="Public email" value={publicEmail} onChange={(e) => setPublicEmail(e.target.value)} type="email" />
            <Input label="Website URL" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://…" />

            <p className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">Media (URLs)</p>
            <Input label="Cover image URL" value={coverImageUrl} onChange={(e) => setCoverImageUrl(e.target.value)} placeholder="https://…" />
            <Input label="Logo URL" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://…" />

            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-stone-700 dark:text-stone-300">Opening hours (JSON)</label>
              <textarea
                value={operatingHoursJson}
                onChange={(e) => setOperatingHoursJson(e.target.value)}
                rows={12}
                className="font-mono text-xs w-full rounded-md border border-stone-300 bg-white px-3 py-2.5 text-stone-900 focus-ring dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
              />
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Use a <code className="rounded bg-stone-100 px-1 dark:bg-stone-800">summary</code> string, or structured days{' '}
                <code className="rounded bg-stone-100 px-1 dark:bg-stone-800">mon</code>…<code className="rounded bg-stone-100 px-1 dark:bg-stone-800">sun</code> with{' '}
                <code className="rounded bg-stone-100 px-1 dark:bg-stone-800">open</code>, <code className="rounded bg-stone-100 px-1 dark:bg-stone-800">close</code>, or{' '}
                <code className="rounded bg-stone-100 px-1 dark:bg-stone-800">closed: true</code>.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-stone-700 dark:text-stone-300">Amenities (one per line)</label>
              <textarea
                value={amenitiesText}
                onChange={(e) => setAmenitiesText(e.target.value)}
                rows={5}
                placeholder="Wi-Fi&#10;Card payment&#10;Parking nearby"
                className="w-full rounded-md border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 focus-ring dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-stone-700 dark:text-stone-300">Gallery image URLs (one per line)</label>
              <textarea
                value={galleryText}
                onChange={(e) => setGalleryText(e.target.value)}
                rows={5}
                className="w-full rounded-md border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 focus-ring dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-stone-700 dark:text-stone-300">Team highlights (JSON array)</label>
              <textarea
                value={staffJson}
                onChange={(e) => setStaffJson(e.target.value)}
                rows={8}
                className="font-mono text-xs w-full rounded-md border border-stone-300 bg-white px-3 py-2.5 text-stone-900 focus-ring dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
              />
              <p className="text-xs text-stone-500 dark:text-stone-400">Example: [&#123; &quot;name&quot;: &quot;…&quot;, &quot;title&quot;: &quot;…&quot;, &quot;bio&quot;: &quot;…&quot;, &quot;photoUrl&quot;: &quot;https://…&quot; &#125;]</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-stone-700 dark:text-stone-300">Social links (JSON object)</label>
              <textarea
                value={socialJson}
                onChange={(e) => setSocialJson(e.target.value)}
                rows={4}
                className="font-mono text-xs w-full rounded-md border border-stone-300 bg-white px-3 py-2.5 text-stone-900 focus-ring dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
              />
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <Button type="submit" loading={saving}>
                Save changes
              </Button>
              <Link
                to="/marketplace"
                className="inline-flex items-center justify-center rounded-md border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-stone-800 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
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
