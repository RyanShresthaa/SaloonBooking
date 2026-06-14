import { useLayoutEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import gsap from 'gsap';
import { customerMotion } from '@/config/customerMotion';

const AUTH_PATHNAMES = new Set([
  '/login',
  '/register',
  '/verify-email',
  '/forgot-password',
  '/reset-password',
]);

export function isAuthShellPath(pathname: string) {
  return AUTH_PATHNAMES.has(pathname);
}

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Richer entrance on auth routes (register / login / etc.) for guests — independent of dashboard motion.
 */
export default function AuthRouteMotion() {
  const location = useLocation();
  const wrapRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (prefersReducedMotion()) return;
    const wrap = wrapRef.current;
    if (!wrap) return;

    const panel = wrap.querySelector<HTMLElement>(
      '.surface-card, .surface-muted, [data-motion-card]'
    );
    const fields = wrap.querySelectorAll<HTMLElement>(
      'form input, form select, form textarea, form button[type="submit"]'
    );

    const tl = gsap.timeline({ defaults: { ease: customerMotion.auth.panelEase } });
    tl.fromTo(wrap, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2 });
    if (panel) {
      tl.fromTo(
        panel,
        {
          autoAlpha: 0,
          y: customerMotion.auth.panelY,
          scale: 0.965,
          filter: `blur(${customerMotion.auth.panelBlurFrom}px)`,
          transformOrigin: '50% 10%',
        },
        { autoAlpha: 1, y: 0, scale: 1, filter: 'blur(0px)', duration: customerMotion.auth.panelDuration },
        0
      );
    }
    if (fields.length) {
      tl.fromTo(
        fields,
        { autoAlpha: 0, y: 10 },
        {
          autoAlpha: 1,
          y: 0,
          stagger: customerMotion.auth.fieldStagger,
          duration: customerMotion.auth.fieldDuration,
          ease: 'power2.out',
        },
        '-=0.38'
      );
    }

    return () => {
      tl.kill();
      gsap.killTweensOf(wrap);
      gsap.set(wrap, { autoAlpha: 1, clearProps: 'transform,filter' });
      if (panel) gsap.set(panel, { autoAlpha: 1, clearProps: 'transform,filter' });
      if (fields.length) gsap.set(fields, { autoAlpha: 1, clearProps: 'transform,filter' });
    };
  }, [location.pathname]);

  return (
    <div
      ref={wrapRef}
      data-defer-route-stagger
      className="auth-route-shell relative flex w-full justify-center px-4 py-8 sm:py-12"
    >
      {/* Subtle paper grain + warmth — auth routes only */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.55] mix-blend-multiply dark:opacity-25 dark:mix-blend-soft-light"
        aria-hidden
        style={{
          backgroundImage: `
            radial-gradient(ellipse 90% 60% at 50% -20%, rgba(176, 125, 98, 0.14), transparent 50%),
            url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='a'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23a)' opacity='.35'/%3E%3C/svg%3E")
          `,
          backgroundSize: '100% 100%, 180px 180px',
        }}
      />
      <Outlet />
    </div>
  );
}
