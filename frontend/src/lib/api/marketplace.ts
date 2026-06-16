import api from '../axios';

export type MarketplaceSalonCard = {
  id: string;
  slug: string;
  name: string;
  description: string;
  logoUrl?: string | null;
  coverImageUrl?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  region?: string | null;
  postalCode?: string | null;
  country?: string | null;
  priceFrom?: number | null;
  priceTo?: number | null;
  verified?: boolean;
  featuredRank?: number | null;
  sponsoredRank?: number | null;
  /** Average published review rating (1–5), when available */
  avgRating?: number | null;
  reviewCount?: number;
};

/** Matches `GET /public/marketplace/salons/:slug/services` — `{ salonId, services }`. */
export type SalonPublicServicesPayload = {
  salonId: string;
  services: Array<{
    id: string;
    name: string;
    description?: string | null;
    duration: number;
    price: number;
    discountPrice?: number | null;
    [key: string]: unknown;
  }>;
};

export type MarketplaceSalonDetail = MarketplaceSalonCard & {
  addressLine1?: string | null;
  addressLine2?: string | null;
  postalCode?: string | null;
  publicPhone?: string | null;
  publicEmail?: string | null;
  websiteUrl?: string | null;
  operatingHours?: unknown;
  servicesCatalog?: unknown;
  staffHighlights?: unknown;
  socialLinks?: unknown;
  amenities?: unknown;
  galleryImages?: unknown;
  videoUrls?: unknown;
  verified?: boolean;
  verifiedAt?: string | null;
  featuredRank?: number | null;
  sponsoredRank?: number | null;
};

/** When `GET .../salons/:slug?includeServices=1` is used, `services` lists bookable `Service` rows. */
export type MarketplaceSalonDetailWithServices = MarketplaceSalonDetail & {
  services: SalonPublicServicesPayload['services'];
};

export type SalonPublicReview = {
  id: string;
  rating: number;
  title?: string | null;
  body?: string | null;
  createdAt: string;
  author?: { id: string; name: string } | null;
};

export type MarketplaceSort =
  | 'name'
  | 'featured'
  | 'sponsored'
  | 'price_asc'
  | 'price_desc'
  | 'rating'
  | 'reviews'
  | 'popularity';

export function listMarketplaceSalons(params?: {
  city?: string;
  region?: string;
  q?: string;
  /** Match live bookable services whose name contains this text (case-insensitive). */
  serviceQ?: string;
  platformCategoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  /** Minimum average review rating (published reviews only). */
  minRating?: number;
  sort?: MarketplaceSort;
  limit?: number;
  offset?: number;
}) {
  return api.get<{ success: boolean; data: { salons: MarketplaceSalonCard[]; count: number } }>(
    '/public/marketplace/salons',
    { params },
  );
}

export function getMarketplaceSalonBySlug(slug: string, opts?: { includeServices?: boolean }) {
  return api.get<{ success: boolean; data: MarketplaceSalonDetail | MarketplaceSalonDetailWithServices }>(
    `/public/marketplace/salons/${encodeURIComponent(slug)}`,
    { params: opts?.includeServices ? { includeServices: '1' } : {} },
  );
}

export function listSalonReviewsBySlug(slug: string, params?: { limit?: number; offset?: number }) {
  return api.get<{ success: boolean; data: { reviews: SalonPublicReview[]; count: number } }>(
    `/public/marketplace/salons/${encodeURIComponent(slug)}/reviews`,
    {
      params: {
        limit: params?.limit != null ? Math.min(params.limit, 50) : 20,
        offset: params?.offset ?? 0,
      },
    },
  );
}

/** Accepts either a bare array (legacy) or `{ services }` from the API. */
export function normalizeSalonServicesResponse(data: unknown): SalonPublicServicesPayload['services'] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object' && Array.isArray((data as { services?: unknown }).services)) {
    return (data as SalonPublicServicesPayload).services;
  }
  return [];
}

export function listSalonServicesBySlug(slug: string) {
  return api.get<{ success: boolean; data: SalonPublicServicesPayload | SalonPublicServicesPayload['services'] }>(
    `/public/marketplace/salons/${encodeURIComponent(slug)}/services`,
  );
}

export function applyMarketplaceSalon(body: Record<string, unknown>) {
  return api.post('/marketplace/apply', body);
}

export function getMyMarketplaceApplications() {
  return api.get('/marketplace/mine');
}

/** Current tenant’s single marketplace row (admin/staff with `salonId`). */
export function getTenantMarketplaceListing() {
  return api.get<{ success: boolean; data: Record<string, unknown> }>('/marketplace/listing');
}

/** Partial update — only server-allowed fields are applied (slug & status stay locked). */
export function patchTenantMarketplaceListing(body: Record<string, unknown>) {
  return api.patch<{ success: boolean; data: Record<string, unknown> }>('/marketplace/listing', body);
}

export function adminListMarketplace(params?: { status?: string; limit?: number; offset?: number }) {
  return api.get<{ success: boolean; data: { rows: unknown[]; count: number } }>('/admin/marketplace', {
    params,
  });
}

export function adminGetMarketplaceListing(id: string) {
  return api.get(`/admin/marketplace/${id}`);
}

export function adminModerateMarketplace(
  id: string,
  body: { listingStatus: string; adminReviewNotes?: string; slug?: string },
) {
  return api.patch(`/admin/marketplace/${id}`, body);
}

export function adminDeleteMarketplaceListing(id: string) {
  return api.delete(`/admin/marketplace/${id}`);
}

export function adminCreateMarketplaceListing(body: Record<string, unknown>) {
  return api.post('/admin/marketplace', body);
}
