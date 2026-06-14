import 'lenis/dist/lenis.css';
import { ReactLenis, useLenis } from 'lenis/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useCallback, useLayoutEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { customerMotion } from '@/config/customerMotion';
import { isAuthShellPath } from '@/components/motion/AuthRouteMotion';

gsap.registerPlugin(ScrollTrigger);

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Keeps GSAP ScrollTrigger in sync with Lenis-driven scroll (e.g. landing scrub). */
function LenisScrollTriggerBridge() {
  const onScroll = useCallback(() => {
    ScrollTrigger.update();
  }, []);
  useLenis(onScroll, [onScroll]);
  return null;
}

function CustomerPageTransition({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const rootRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (prefersReducedMotion()) return;
    const root = rootRef.current;
    if (!root) return;

    gsap.killTweensOf(root);
    const { selectors, maxElements, staggerEach, duration: cardDur, ease: cardEase, y: cardY } =
      customerMotion.cards;
    const allCards = gsap.utils.toArray<HTMLElement>(root.querySelectorAll(selectors)).slice(0, maxElements);
    const cards = allCards.filter((el) => !el.closest('[data-defer-route-stagger]'));
    if (cards.length) gsap.killTweensOf(cards);

    const headers = gsap.utils
      .toArray<HTMLElement>(root.querySelectorAll(customerMotion.extras.headerSelector))
      .slice(0, 4);

    const tl = gsap.timeline({
      defaults: { ease: customerMotion.page.ease },
      onComplete: () => ScrollTrigger.refresh(),
    });

    // Auth stack has its own blur/entrance (AuthRouteMotion). Running the global page blur + card
    // stagger on the same `.surface-card` stacks filters and can leave the screen stuck looking
    // heavily blurred when switching login ↔ register.
    const authShell = isAuthShellPath(location.pathname);
    if (!authShell) {
      tl.fromTo(
        root,
        {
          autoAlpha: 0,
          y: customerMotion.page.y,
          scale: customerMotion.page.scaleFrom,
          filter: `blur(${customerMotion.page.blurFrom}px)`,
          transformOrigin: '50% 0%',
        },
        {
          autoAlpha: 1,
          y: 0,
          scale: 1,
          filter: `blur(${customerMotion.page.blurTo}px)`,
          duration: customerMotion.page.duration,
        }
      );
    } else {
      gsap.killTweensOf(root);
      gsap.set(root, { autoAlpha: 1, clearProps: 'transform,filter' });
    }
    if (headers.length > 0) {
      tl.fromTo(
        headers,
        { autoAlpha: 0, y: customerMotion.extras.headerY },
        {
          autoAlpha: 1,
          y: 0,
          duration: customerMotion.extras.headerDuration,
          stagger: staggerEach,
          ease: 'power2.out',
        },
        customerMotion.extras.headerDelay
      );
    }
    if (cards.length > 0) {
      tl.fromTo(
        cards,
        { autoAlpha: 0, y: cardY, rotateX: 5, transformOrigin: '50% 0%' },
        {
          autoAlpha: 1,
          y: 0,
          rotateX: 0,
          stagger: { each: staggerEach, from: 'start' },
          duration: cardDur,
          ease: cardEase,
          transformPerspective: 1500,
        },
        '-=0.36'
      );
    }

    return () => {
      tl.kill();
      // React StrictMode remounts effects; killing mid-tween can leave autoAlpha at 0 and a blank route.
      gsap.killTweensOf(root);
      gsap.set(root, { autoAlpha: 1, clearProps: 'transform,filter' });
      if (headers.length) {
        gsap.killTweensOf(headers);
        gsap.set(headers, { autoAlpha: 1, clearProps: 'transform' });
      }
      if (cards.length) {
        gsap.killTweensOf(cards);
        gsap.set(cards, { autoAlpha: 1, clearProps: 'transform,rotateX,filter' });
      }
    };
  }, [location.pathname]);

  return (
    <div id="customer-motion-root" ref={rootRef} className="min-w-0 [perspective:1600px]">
      {children}
    </div>
  );
}

/**
 * Lenis smooth scroll + GSAP page reveals for guests and customers only.
 * Admin/staff get the standard layout with no Lenis and no route motion.
 */
export function CustomerMotionExperience({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  const isSalonDesk = user?.role === 'admin' || user?.role === 'staff';
  const reduced = prefersReducedMotion();

  useLayoutEffect(() => {
    if (isSalonDesk || reduced) {
      document.documentElement.removeAttribute('data-customer-motion');
      return;
    }
    document.documentElement.setAttribute('data-customer-motion', '1');
    return () => {
      document.documentElement.removeAttribute('data-customer-motion');
    };
  }, [isSalonDesk, reduced]);

  useLayoutEffect(() => {
    if (isSalonDesk || reduced) {
      requestAnimationFrame(() => ScrollTrigger.refresh());
    }
  }, [isSalonDesk, reduced]);

  if (isSalonDesk || reduced) {
    return <>{children}</>;
  }

  return (
    <ReactLenis root options={{ ...customerMotion.lenis }}>
      <LenisScrollTriggerBridge />
      <CustomerPageTransition>{children}</CustomerPageTransition>
    </ReactLenis>
  );
}
