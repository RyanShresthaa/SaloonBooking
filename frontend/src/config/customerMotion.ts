/**
 * Central tuning for customer-only motion (Lenis + GSAP) and related UX timing.
 * Edit values here to rebalance polish vs speed — admin/staff never load this path.
 */
export const customerMotion = {
  /** Page shell enter (route change) */
  page: {
    duration: 0.55,
    ease: 'power3.out' as const,
    y: 12,
    scaleFrom: 0.995,
    blurFrom: 2,
    blurTo: 0,
  },
  /** Staggered panels */
  cards: {
    staggerEach: 0.046,
    duration: 0.48,
    ease: 'power2.out' as const,
    y: 22,
    maxElements: 22,
    selectors: '.surface-card, .surface-muted, [data-motion-card]',
  },
  /** In-page headers (first few) */
  extras: {
    headerSelector: 'header',
    headerDelay: '-=0.44',
    headerDuration: 0.48,
    headerY: 16,
  },
  /** Auth stack */
  auth: {
    panelDuration: 0.6,
    panelEase: 'power3.out' as const,
    panelY: 28,
    fieldStagger: 0.055,
    fieldDuration: 0.36,
    panelBlurFrom: 5,
  },
  /** Lenis */
  lenis: {
    lerp: 0.075,
    smoothWheel: true,
    wheelMultiplier: 0.88,
    touchMultiplier: 1.08,
    syncTouch: true,
    syncTouchLerp: 0.07,
  },
  /**
   * Customer dashboard: stats load after route paint — animate in here (see `data-defer-route-stagger`).
   */
  dashboard: {
    stagger: 0.08,
    duration: 0.52,
    ease: 'power2.out' as const,
    yFrom: 14,
    scaleFrom: 0.99,
  },
} as const;
