import api from '../axios';

export type PlatformCategoryRow = {
  id: string;
  name: string;
  slug: string;
  iconUrl?: string | null;
  sortOrder: number;
};

export type PlatformBannerRow = {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl?: string | null;
  isActive: boolean;
  sortOrder: number;
  startsAt?: string | null;
  endsAt?: string | null;
};

export async function platformListCategories() {
  const res = await api.get<{ success: boolean; data: PlatformCategoryRow[] }>('/platform/categories');
  return res.data.data;
}

export async function platformCreateCategory(body: {
  name: string;
  slug: string;
  iconUrl?: string;
  sortOrder?: number;
}) {
  const res = await api.post<{ success: boolean; data: PlatformCategoryRow }>('/platform/categories', body);
  return res.data.data;
}

export async function platformPatchCategory(id: string, body: Partial<Pick<PlatformCategoryRow, 'name' | 'slug' | 'iconUrl' | 'sortOrder'>>) {
  const res = await api.patch<{ success: boolean; data: PlatformCategoryRow }>(
    `/platform/categories/${encodeURIComponent(id)}`,
    body,
  );
  return res.data.data;
}

export async function platformDeleteCategory(id: string) {
  await api.delete(`/platform/categories/${encodeURIComponent(id)}`);
}

export async function platformListBanners() {
  const res = await api.get<{ success: boolean; data: PlatformBannerRow[] }>('/platform/banners');
  return res.data.data;
}

export async function platformCreateBanner(body: {
  title: string;
  imageUrl: string;
  linkUrl?: string | null;
  isActive?: boolean;
  sortOrder?: number;
  startsAt?: string | null;
  endsAt?: string | null;
}) {
  const res = await api.post<{ success: boolean; data: PlatformBannerRow }>('/platform/banners', body);
  return res.data.data;
}

export async function platformPatchBanner(
  id: string,
  body: Partial<
    Pick<PlatformBannerRow, 'title' | 'imageUrl' | 'linkUrl' | 'isActive' | 'sortOrder' | 'startsAt' | 'endsAt'>
  >,
) {
  const res = await api.patch<{ success: boolean; data: PlatformBannerRow }>(
    `/platform/banners/${encodeURIComponent(id)}`,
    body,
  );
  return res.data.data;
}

export async function platformDeleteBanner(id: string) {
  await api.delete(`/platform/banners/${encodeURIComponent(id)}`);
}

/** Placement / trust flags for a marketplace row (`MarketplaceSalon` id). */
export async function platformPatchSalon(
  id: string,
  body: Partial<{
    featuredRank: number | null;
    sponsoredRank: number | null;
    verifiedAt: string | null;
    suspendedAt: string | null;
    listingStatus: string;
    adminReviewNotes: string | null;
  }>,
) {
  const res = await api.patch<{ success: boolean; data: Record<string, unknown> }>(
    `/platform/salons/${encodeURIComponent(id)}`,
    body,
  );
  return res.data.data;
}
