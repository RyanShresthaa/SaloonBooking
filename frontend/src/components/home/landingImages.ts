/**
 * Editorial salon photography via Unsplash CDN (stable URLs).
 * (source.unsplash.com is deprecated; images.unsplash.com is the supported CDN.)
 */
export const LANDING_IMAGES = {
  /** Hero — salon floor / styling */
  hero: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=2400&q=85&auto=format&fit=crop',
  /** Hero secondary / split panel */
  heroAccent: 'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=1600&q=85&auto=format&fit=crop',
  /** Gallery — colour work (verified 200 on Unsplash CDN) */
  galleryColor: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=1200&q=80&auto=format&fit=crop',
  /** Gallery — interior (verified 200 on Unsplash CDN) */
  galleryInterior: 'https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=1200&q=80&auto=format&fit=crop',
  /** Gallery — client moment */
  galleryClient: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=1200&q=80&auto=format&fit=crop',
  /** Wide banner — atmosphere */
  banner: 'https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?w=2000&q=80&auto=format&fit=crop',
} as const;
