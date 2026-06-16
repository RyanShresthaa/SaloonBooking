/**
 * Editorial salon photography via Unsplash CDN (stable URLs).
 * (source.unsplash.com is deprecated; images.unsplash.com is the supported CDN.)
 */
export const LANDING_IMAGES = {
  /** Hero — salon floor / styling */
  hero: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=2400&q=85&auto=format&fit=crop',
  /** Hero secondary / split panel */
  heroAccent: 'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=1600&q=85&auto=format&fit=crop',
  /** Gallery — colour work */
  galleryColor: 'https://images.unsplash.com/photo-1522337360788-8b13dee37037?w=1200&q=80&auto=format&fit=crop',
  /** Gallery — interior */
  galleryInterior: 'https://images.unsplash.com/photo-1633681926022-84c23e8cb2e0?w=1200&q=80&auto=format&fit=crop',
  /** Gallery — client moment */
  galleryClient: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=1200&q=80&auto=format&fit=crop',
  /** Wide banner — atmosphere */
  banner: 'https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?w=2000&q=80&auto=format&fit=crop',
} as const;
