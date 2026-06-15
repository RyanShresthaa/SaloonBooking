'use client';

import { useCallback, useEffect, useState } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import {
  platformCreateBanner,
  platformCreateCategory,
  platformDeleteBanner,
  platformDeleteCategory,
  platformListBanners,
  platformListCategories,
  platformPatchBanner,
  platformPatchCategory,
  type PlatformBannerRow,
  type PlatformCategoryRow,
} from '@/lib/api/platformAdmin';
import { getApiErrorMessage } from '@/lib/utils/apiError';

function toDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocal(v: string): string | null {
  if (!v.trim()) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function CategoryEditor({ row, onUpdated }: { row: PlatformCategoryRow; onUpdated: () => void }) {
  const [name, setName] = useState(row.name);
  const [slug, setSlug] = useState(row.slug);
  const [iconUrl, setIconUrl] = useState(row.iconUrl || '');
  const [sortOrder, setSortOrder] = useState(String(row.sortOrder ?? 0));
  const [busy, setBusy] = useState(false);
  const [localErr, setLocalErr] = useState('');

  useEffect(() => {
    setName(row.name);
    setSlug(row.slug);
    setIconUrl(row.iconUrl || '');
    setSortOrder(String(row.sortOrder ?? 0));
  }, [row]);

  const save = async () => {
    setBusy(true);
    setLocalErr('');
    try {
      await platformPatchCategory(row.id, {
        name: name.trim(),
        slug: slug.trim().toLowerCase(),
        iconUrl: iconUrl.trim() || null,
        sortOrder: Number(sortOrder) || 0,
      });
      onUpdated();
    } catch (e: unknown) {
      setLocalErr(getApiErrorMessage(e, 'Save failed.'));
    } finally {
      setBusy(false);
    }
  };

  const del = async () => {
    if (!window.confirm(`Delete category “${row.name}”?`)) return;
    setBusy(true);
    setLocalErr('');
    try {
      await platformDeleteCategory(row.id);
      onUpdated();
    } catch (e: unknown) {
      setLocalErr(getApiErrorMessage(e, 'Delete failed.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-3 border-b border-stone-200 py-4 last:border-b-0 dark:border-stone-700 sm:grid-cols-2 lg:grid-cols-12 lg:items-end">
      <div className="lg:col-span-3">
        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} disabled={busy} />
      </div>
      <div className="lg:col-span-3">
        <Input label="Slug" value={slug} onChange={(e) => setSlug(e.target.value)} disabled={busy} />
      </div>
      <div className="lg:col-span-3">
        <Input label="Icon URL" value={iconUrl} onChange={(e) => setIconUrl(e.target.value)} disabled={busy} />
      </div>
      <div className="lg:col-span-1">
        <Input label="Sort" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} disabled={busy} />
      </div>
      <div className="flex flex-wrap gap-2 lg:col-span-2">
        <Button type="button" size="sm" loading={busy} onClick={save}>
          Save
        </Button>
        <Button type="button" size="sm" variant="danger" loading={busy} onClick={del}>
          Delete
        </Button>
      </div>
      {localErr ? <p className="text-xs text-red-700 sm:col-span-full">{localErr}</p> : null}
    </div>
  );
}

function BannerEditor({ row, onUpdated }: { row: PlatformBannerRow; onUpdated: () => void }) {
  const [title, setTitle] = useState(row.title);
  const [imageUrl, setImageUrl] = useState(row.imageUrl);
  const [linkUrl, setLinkUrl] = useState(row.linkUrl || '');
  const [sortOrder, setSortOrder] = useState(String(row.sortOrder ?? 0));
  const [isActive, setIsActive] = useState(row.isActive);
  const [startsAt, setStartsAt] = useState(toDatetimeLocal(row.startsAt));
  const [endsAt, setEndsAt] = useState(toDatetimeLocal(row.endsAt));
  const [busy, setBusy] = useState(false);
  const [localErr, setLocalErr] = useState('');

  useEffect(() => {
    setTitle(row.title);
    setImageUrl(row.imageUrl);
    setLinkUrl(row.linkUrl || '');
    setSortOrder(String(row.sortOrder ?? 0));
    setIsActive(row.isActive);
    setStartsAt(toDatetimeLocal(row.startsAt));
    setEndsAt(toDatetimeLocal(row.endsAt));
  }, [row]);

  const save = async () => {
    setBusy(true);
    setLocalErr('');
    try {
      await platformPatchBanner(row.id, {
        title: title.trim(),
        imageUrl: imageUrl.trim(),
        linkUrl: linkUrl.trim() || null,
        sortOrder: Number(sortOrder) || 0,
        isActive,
        startsAt: fromDatetimeLocal(startsAt),
        endsAt: fromDatetimeLocal(endsAt),
      });
      onUpdated();
    } catch (e: unknown) {
      setLocalErr(getApiErrorMessage(e, 'Save failed.'));
    } finally {
      setBusy(false);
    }
  };

  const del = async () => {
    if (!window.confirm(`Delete banner “${row.title}”?`)) return;
    setBusy(true);
    setLocalErr('');
    try {
      await platformDeleteBanner(row.id);
      onUpdated();
    } catch (e: unknown) {
      setLocalErr(getApiErrorMessage(e, 'Delete failed.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 border-b border-stone-200 py-4 last:border-b-0 dark:border-stone-700">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} disabled={busy} />
        <Input label="Image URL" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} disabled={busy} />
        <Input label="Link URL" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} disabled={busy} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Input label="Sort" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} disabled={busy} />
        <label className="flex items-end gap-2 pb-2 text-sm text-stone-700 dark:text-stone-300">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} disabled={busy} />
          Active
        </label>
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">Starts (optional)</label>
          <input
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            disabled={busy}
            className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm dark:border-stone-600 dark:bg-stone-900"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">Ends (optional)</label>
          <input
            type="datetime-local"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
            disabled={busy}
            className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm dark:border-stone-600 dark:bg-stone-900"
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" loading={busy} onClick={save}>
          Save
        </Button>
        <Button type="button" size="sm" variant="danger" loading={busy} onClick={del}>
          Delete
        </Button>
      </div>
      {localErr ? <p className="text-xs text-red-700">{localErr}</p> : null}
    </div>
  );
}

export default function PlatformCatalogAdminPanel() {
  const [categories, setCategories] = useState<PlatformCategoryRow[]>([]);
  const [banners, setBanners] = useState<PlatformBannerRow[]>([]);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const [catNew, setCatNew] = useState({ name: '', slug: '', iconUrl: '', sortOrder: '0' });
  const [banNew, setBanNew] = useState({
    title: '',
    imageUrl: '',
    linkUrl: '',
    sortOrder: '0',
    isActive: true,
    startsAt: '',
    endsAt: '',
  });
  const [creatingCat, setCreatingCat] = useState(false);
  const [creatingBan, setCreatingBan] = useState(false);

  const load = useCallback(async () => {
    setErr('');
    setLoading(true);
    try {
      const [c, b] = await Promise.all([platformListCategories(), platformListBanners()]);
      setCategories(c);
      setBanners(b);
    } catch (e: unknown) {
      setErr(getApiErrorMessage(e, 'Could not load categories or banners.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const addCategory = async () => {
    if (!catNew.name.trim() || !catNew.slug.trim()) {
      setErr('Category name and slug are required.');
      return;
    }
    setCreatingCat(true);
    setErr('');
    try {
      await platformCreateCategory({
        name: catNew.name.trim(),
        slug: catNew.slug.trim().toLowerCase(),
        iconUrl: catNew.iconUrl.trim() || undefined,
        sortOrder: Number(catNew.sortOrder) || 0,
      });
      setCatNew({ name: '', slug: '', iconUrl: '', sortOrder: '0' });
      await load();
    } catch (e: unknown) {
      setErr(getApiErrorMessage(e, 'Could not create category.'));
    } finally {
      setCreatingCat(false);
    }
  };

  const addBanner = async () => {
    if (!banNew.title.trim() || !banNew.imageUrl.trim()) {
      setErr('Banner title and image URL are required.');
      return;
    }
    setCreatingBan(true);
    setErr('');
    try {
      await platformCreateBanner({
        title: banNew.title.trim(),
        imageUrl: banNew.imageUrl.trim(),
        linkUrl: banNew.linkUrl.trim() || null,
        sortOrder: Number(banNew.sortOrder) || 0,
        isActive: banNew.isActive,
        startsAt: fromDatetimeLocal(banNew.startsAt),
        endsAt: fromDatetimeLocal(banNew.endsAt),
      });
      setBanNew({ title: '', imageUrl: '', linkUrl: '', sortOrder: '0', isActive: true, startsAt: '', endsAt: '' });
      await load();
    } catch (e: unknown) {
      setErr(getApiErrorMessage(e, 'Could not create banner.'));
    } finally {
      setCreatingBan(false);
    }
  };

  if (loading) {
    return (
      <div className="mt-10 flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-stone-800" />
      </div>
    );
  }

  return (
    <div className="mt-10 space-y-10">
      {err ? <p className="text-sm text-red-800">{err}</p> : null}

      <section className="surface-card rounded-lg p-5 sm:p-6">
        <h2 className="font-display text-lg text-stone-900 dark:text-stone-50">Service categories</h2>
        <p className="mt-1 text-xs text-stone-600 dark:text-stone-400">
          Browse filters and salon listings use these rows. Slugs must stay URL-safe and unique.
        </p>

        <div className="mt-6 rounded-lg border border-dashed border-stone-300 p-4 dark:border-stone-600">
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Add category</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-3">
              <Input label="Name" value={catNew.name} onChange={(e) => setCatNew((s) => ({ ...s, name: e.target.value }))} />
            </div>
            <div className="lg:col-span-3">
              <Input label="Slug" value={catNew.slug} onChange={(e) => setCatNew((s) => ({ ...s, slug: e.target.value }))} />
            </div>
            <div className="lg:col-span-3">
              <Input
                label="Icon URL"
                value={catNew.iconUrl}
                onChange={(e) => setCatNew((s) => ({ ...s, iconUrl: e.target.value }))}
              />
            </div>
            <div className="lg:col-span-1">
              <Input
                label="Sort"
                value={catNew.sortOrder}
                onChange={(e) => setCatNew((s) => ({ ...s, sortOrder: e.target.value }))}
              />
            </div>
            <div className="lg:col-span-2">
              <Button type="button" size="sm" loading={creatingCat} onClick={addCategory}>
                Create
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-4">
          {categories.length === 0 ? (
            <p className="text-sm text-stone-600 dark:text-stone-400">No categories yet.</p>
          ) : (
            categories.map((row) => <CategoryEditor key={row.id} row={row} onUpdated={load} />)
          )}
        </div>
      </section>

      <section className="surface-card rounded-lg p-5 sm:p-6">
        <h2 className="font-display text-lg text-stone-900 dark:text-stone-50">Home banners</h2>
        <p className="mt-1 text-xs text-stone-600 dark:text-stone-400">
          Hero carousel on the public marketplace home. Inactive or out-of-range dates are hidden where the API applies
          filters.
        </p>

        <div className="mt-6 rounded-lg border border-dashed border-stone-300 p-4 dark:border-stone-600">
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Add banner</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Input label="Title" value={banNew.title} onChange={(e) => setBanNew((s) => ({ ...s, title: e.target.value }))} />
            <Input
              label="Image URL"
              value={banNew.imageUrl}
              onChange={(e) => setBanNew((s) => ({ ...s, imageUrl: e.target.value }))}
            />
            <Input label="Link URL" value={banNew.linkUrl} onChange={(e) => setBanNew((s) => ({ ...s, linkUrl: e.target.value }))} />
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Input
              label="Sort"
              value={banNew.sortOrder}
              onChange={(e) => setBanNew((s) => ({ ...s, sortOrder: e.target.value }))}
            />
            <label className="flex items-end gap-2 pb-2 text-sm text-stone-700 dark:text-stone-300">
              <input
                type="checkbox"
                checked={banNew.isActive}
                onChange={(e) => setBanNew((s) => ({ ...s, isActive: e.target.checked }))}
              />
              Active
            </label>
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">Starts</label>
              <input
                type="datetime-local"
                value={banNew.startsAt}
                onChange={(e) => setBanNew((s) => ({ ...s, startsAt: e.target.value }))}
                className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm dark:border-stone-600 dark:bg-stone-900"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">Ends</label>
              <input
                type="datetime-local"
                value={banNew.endsAt}
                onChange={(e) => setBanNew((s) => ({ ...s, endsAt: e.target.value }))}
                className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm dark:border-stone-600 dark:bg-stone-900"
              />
            </div>
          </div>
          <div className="mt-3">
            <Button type="button" size="sm" loading={creatingBan} onClick={addBanner}>
              Create
            </Button>
          </div>
        </div>

        <div className="mt-4">
          {banners.length === 0 ? (
            <p className="text-sm text-stone-600 dark:text-stone-400">No banners yet.</p>
          ) : (
            banners.map((row) => <BannerEditor key={row.id} row={row} onUpdated={load} />)
          )}
        </div>
      </section>
    </div>
  );
}
