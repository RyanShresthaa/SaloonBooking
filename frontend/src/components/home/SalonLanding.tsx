import { useEffect, useLayoutEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Calendar, Heart, Sparkles, Sun } from 'lucide-react';
import HeroAuthCTA from '@/components/home/HeroAuthCTA';
import { useAuthStore } from '@/store/authStore';

gsap.registerPlugin(ScrollTrigger);

/** Used by GSAP setup — skips motion when the OS requests reduced motion */
function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/* ─────────────────────────────────────────────────────────────────────────────
   Declarations follow the page roughly top → bottom:
   (1) Hero — no shared constants; markup lives in SalonLanding JSX below
   (2) Marquee
   (3) Services
   (4) Testimonial + (5) Stats — inline in JSX (no exports here)
   (6) Footer — CTA subcomponent, then closing band in JSX
   ───────────────────────────────────────────────────────────────────────────── */

/** Marquee strip (under hero) — duplicated in JSX for seamless CSS scroll */
const marqueeItems = (
  <>
    <span className="inline-flex items-center gap-10 px-6 text-xs font-semibold uppercase tracking-[0.35em] text-stone-300">
      <span>Cut & color</span>
      <span className="text-rose-300/90">·</span>
      <span>Silk press</span>
      <span className="text-rose-300/90">·</span>
      <span>Scalp reset</span>
      <span className="text-rose-300/90">·</span>
      <span>Same-day text</span>
      <span className="text-rose-300/90">·</span>
    </span>
  </>
);

/** Services grid — “Small shop habits” intro + cards */
const services = [
  {
    icon: Sparkles,
    title: 'Cut & style',
    blurb: 'Shapes that grow out kindly—so you still like your hair six weeks later.',
  },
  {
    icon: Sun,
    title: 'Color',
    blurb: 'Balayage, gloss, and corrections with honest timing and patch tests.',
  },
  {
    icon: Heart,
    title: 'Treatments',
    blurb: 'Silk presses, masks, and scalp care when your hair needs a quiet reset.',
  },
  {
    icon: Calendar,
    title: 'Booking',
    blurb: 'Same-day notes, running late texts, and a diary that does not panic.',
  },
] as const;

/** Footer / closing band — auth-aware CTAs (register + login vs appointments) */
function LandingFooterCta() {
  const { isAuthenticated, hydrate } = useAuthStore();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  if (isAuthenticated) {
    return (
      <Link
        to="/appointments"
        className="inline-flex items-center justify-center rounded-md bg-rose-100 px-5 py-2.5 text-sm font-semibold text-stone-900 transition hover:bg-rose-200 focus-ring"
      >
        Open appointments
      </Link>
    );
  }

  return (
    <>
      <Link
        to="/register"
        className="inline-flex items-center justify-center rounded-md bg-rose-100 px-5 py-2.5 text-sm font-semibold text-stone-900 transition hover:bg-rose-200 focus-ring"
      >
        Create account
      </Link>
      <Link
        to="/login"
        className="inline-flex items-center justify-center rounded-md border border-stone-600 bg-transparent px-5 py-2.5 text-sm font-semibold text-stone-100 transition hover:border-stone-400 hover:bg-stone-800/50 focus-ring"
      >
        Staff sign in
      </Link>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Page — composes all sections; rootRef is the GSAP scoping root
   ───────────────────────────────────────────────────────────────────────────── */

export default function SalonLanding() {
  const rootRef = useRef<HTMLDivElement>(null);

  /* GSAP runs in page order: (1) hero load + blobs → (3–4) reveals → (5) stats → (6) footer line.
     (2) Marquee is CSS-only. */
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || prefersReducedMotion()) return;

    const ctx = gsap.context(() => {
      /* --- Query DOM in page order (hero → scroll sections → footer line) --- */

      /* (1) Hero — foreground */
      const heroLines = gsap.utils.toArray<HTMLElement>(root.querySelectorAll('[data-hero-line]'));
      const heroMeta = root.querySelectorAll('[data-hero-meta]');
      const heroCta = root.querySelector('[data-hero-cta]');
      const heroVisual = root.querySelector('[data-hero-visual]');

      /* (1) Hero — background blobs */
      const blobs = root.querySelectorAll('[data-blob]');

      /* (3) Services + (4) Testimonial — shared scroll reveal hook */
      const revealBlocks = root.querySelectorAll('[data-reveal]');

      /* (5) Stats */
      const statNums = root.querySelectorAll('[data-stat]');

      /* (6) Footer CTA band — accent line */
      const footLine = root.querySelector('[data-footer-line]');

      /* (1) Hero — headline lines, meta, primary CTA, side card (load timeline) */
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      tl.from(heroLines, {
        yPercent: 108,
        duration: 0.95,
        stagger: 0.11,
        skewY: 2,
      })
        .from(
          heroMeta,
          { y: 18, opacity: 0, duration: 0.55, stagger: 0.08 },
          '-=0.55',
        )
        .from(heroCta, { y: 22, opacity: 0, duration: 0.6, ease: 'power2.out' }, '-=0.35')
        .from(heroVisual, { scale: 0.94, opacity: 0, duration: 0.75, ease: 'power2.out' }, '-=0.75');

      /* (1) Hero — soft floating blobs */
      blobs.forEach((blob, i) => {
        const dur = 5.5 + i * 1.4;
        const xAmp = 10 + i * 6;
        gsap.to(blob, {
          y: 22 + i * 8,
          x: i % 2 === 0 ? xAmp : -xAmp,
          duration: dur,
          ease: 'sine.inOut',
          repeat: -1,
          yoyo: true,
        });
      });

      /* (2) Marquee — CSS-only animation; no GSAP here */

      /* (3) Services intro/cards + (4) testimonial — scroll-triggered */
      revealBlocks.forEach((el) => {
        gsap.from(el, {
          y: 42,
          opacity: 0,
          duration: 0.75,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: el,
            start: 'top 88%',
            toggleActions: 'play none none none',
          },
        });
      });

      /* (5) Stats row */
      statNums.forEach((el, i) => {
        gsap.from(el, {
          y: 20,
          opacity: 0,
          duration: 0.55,
          delay: i * 0.06,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: el,
            start: 'top 90%',
            toggleActions: 'play none none none',
          },
        });
      });

      /* (6) Footer CTA band — top accent line */
      if (footLine) {
        gsap.from(footLine, {
          scaleX: 0,
          transformOrigin: 'left center',
          duration: 1.1,
          ease: 'power2.inOut',
          scrollTrigger: {
            trigger: footLine,
            start: 'top 92%',
            toggleActions: 'play none none none',
          },
        });
      }
    }, root);

    const onRefresh = () => ScrollTrigger.refresh();
    window.addEventListener('resize', onRefresh);

    return () => {
      window.removeEventListener('resize', onRefresh);
      ctx.revert();
    };
  }, []);

  return (
    <div ref={rootRef} className="pb-20 overflow-hidden">
      {/* ========== Hero ==========
          Full-bleed intro: gradient + blobs, headline + CTAs, quote / “next slot” card */}
      <section className="relative left-1/2 mb-20 w-screen max-w-none -translate-x-1/2 px-4 pb-16 pt-2 sm:px-6 sm:pb-20 sm:pt-4">
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-gradient-to-b from-rose-50 via-stone-50 to-white dark:from-rose-950/30 dark:via-stone-950 dark:to-stone-950" />
        <div
          data-blob
          className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-rose-200/50 blur-3xl dark:bg-rose-500/15"
          aria-hidden
        />
        <div
          data-blob
          className="pointer-events-none absolute -right-16 bottom-0 h-80 w-80 rounded-full bg-amber-100/60 blur-3xl dark:bg-amber-900/20"
          aria-hidden
        />
        <div
          data-blob
          className="pointer-events-none absolute left-1/3 top-1/2 h-48 w-48 -translate-y-1/2 rounded-full bg-stone-200/40 blur-2xl dark:bg-stone-700/30"
          aria-hidden
        />

        <div className="mx-auto grid max-w-6xl px-10 gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16">
          <div className="relative z-10">
            <p
              data-hero-meta
              className="mb-5 text-[11px] font-semibold uppercase tracking-[0.32em] text-rose-700/90 dark:text-rose-300/90"
            >
              Independent salon · city hours
            </p>

            <h1 className="font-display text-[2.35rem] font-medium leading-[1.05] tracking-[-0.03em] text-stone-900 dark:text-stone-50 sm:text-5xl lg:text-[3.25rem]">
              <span className="block overflow-hidden pb-1 ">
                <span data-hero-line className="block">
                  Hair that feels
                </span>
              </span>
              <span className="block overflow-hidden pb-1">
                <span data-hero-line className="block text-rose-700 dark:text-rose-300">
                  like yours,
                </span>
              </span>
              <span className="block overflow-hidden pb-1">
                <span data-hero-line className="block">only calmer.</span>
              </span>
            </h1>

            <p
              data-hero-meta
              className="mt-7 max-w-md text-base leading-relaxed text-stone-600 dark:text-stone-400"
            >
              We keep color notes, patch tests, and the small preferences you mention once—so
              every visit picks up where the last one ended.
            </p>

            <div data-hero-cta className="mt-9">
              <HeroAuthCTA />
            </div>

            <p data-hero-meta className="mt-8 text-sm text-stone-500 dark:text-stone-500">
              Walk-ins when we can ·{' '}
              <Link to="/appointments/new" className="link-quiet font-medium">
                Book ahead when you cannot
              </Link>
            </p>  
          </div>

          <div
            data-hero-visual
            className="relative isolate flex min-h-[280px] items-stretch lg:min-h-[360px]"
          >
            <div className="surface-card relative flex w-full flex-col justify-between overflow-hidden rounded-2xl border-rose-200/50 bg-white/80 p-7 shadow-lg shadow-rose-900/5 backdrop-blur-sm dark:border-rose-900/40 dark:bg-stone-900/70 sm:p-9">
              <div className="absolute right-6 top-6 h-24 w-24 rounded-full border border-rose-200/60 dark:border-rose-800/50" aria-hidden />
              <div className="absolute -bottom-8 -left-8 h-40 w-40 rounded-full bg-gradient-to-tr from-rose-100/90 to-transparent dark:from-rose-900/40" aria-hidden />
              <p className="font-display relative max-w-[14rem] text-xl italic leading-snug text-stone-800 dark:text-stone-200 sm:text-2xl">
                &ldquo;Warm water, honest timing, and nobody rushing the toner.&rdquo;
              </p>
              <div className="relative mt-10 flex items-end justify-between gap-4 border-t border-stone-200/80 pt-6 dark:border-stone-700/80">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-stone-400">Next quiet slot</p>
                  <p className="mt-1 font-display text-2xl text-stone-900 dark:text-stone-100">Thu · 2:40</p>
                </div>
                <div className="rounded-full bg-rose-100 px-4 py-2 text-xs font-semibold text-rose-900 dark:bg-rose-950/80 dark:text-rose-100">
                  Low noise
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========== Marquee ==========
          Full-bleed scrolling service keywords (CSS animation; decorative) */}
      <div
        className="landing-marquee-animate relative left-1/2 mb-16 w-screen max-w-none -translate-x-1/2 overflow-hidden border-y border-stone-200/80 bg-stone-900 py-3 text-stone-50 dark:border-stone-800 dark:bg-stone-900"
        aria-hidden
      >
        <div className="landing-marquee-track">
          {marqueeItems}
          {marqueeItems}
        </div>
      </div>

      {/* ========== Services ==========
          Intro column + four service cards (cut, color, treatments, booking) */}
      <section className="mb-20 grid gap-10 lg:grid-cols-3 lg:gap-12">
        <div data-reveal className="lg:col-span-1">
          <h2 className="font-display text-3xl tracking-tight text-stone-900 dark:text-stone-50">
            Small shop habits.
          </h2>
          <p className="mt-4 text-stone-600 dark:text-stone-400">
            We write things down, use timers we trust, and say no when a service needs another day.
            Boring in the best way.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
          {services.map(({ icon: Icon, title, blurb }) => (
            <article
              key={title}
              data-reveal
              className="group surface-card rounded-xl border-stone-200/90 p-6 transition-[border-color,box-shadow] duration-300 hover:border-rose-200/80 hover:shadow-md dark:border-stone-700/90 dark:hover:border-rose-900/50"
            >
              <Icon
                className="mb-4 h-6 w-6 text-rose-600 transition-transform duration-300 group-hover:scale-110 dark:text-rose-400"
                strokeWidth={1.5}
                aria-hidden
              />
              <h3 className="font-display text-xl text-stone-900 dark:text-stone-100">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-600 dark:text-stone-400">{blurb}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ========== Testimonial ==========
          Pull quote / “from the floor” social proof block */}
      <section
        data-reveal
        className="relative mb-20 overflow-hidden rounded-2xl border border-stone-200/90 bg-gradient-to-br from-stone-50 to-white px-6 py-14 dark:border-stone-700/90 dark:from-stone-900 dark:to-stone-950 sm:px-12 sm:py-16"
      >
        <div className="pointer-events-none absolute -right-20 top-0 h-64 w-64 rounded-full bg-rose-100/50 blur-3xl dark:bg-rose-900/25" aria-hidden />
        <div className="relative mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-rose-700 dark:text-rose-300">
            From the floor
          </p>
          <p className="font-display mt-6 text-2xl italic leading-snug text-stone-800 dark:text-stone-200 sm:text-3xl">
            &ldquo;The best compliment is when someone&apos;s mum books off their recommendation.&rdquo;
          </p>
          <p className="mt-6 text-sm text-stone-500 dark:text-stone-500">— Floor lead, Saturday shift</p>
        </div>
      </section>

      {/* ========== Stats ==========
          Three quick trust / policy highlights */}
      <section className="mb-16 grid gap-6 border-t border-stone-200/80 pt-12 dark:border-stone-800 sm:grid-cols-3">
        <div data-stat className="text-center sm:text-left">
          <p className="font-display text-4xl text-stone-900 dark:text-stone-50">12+</p>
          <p className="mt-1 text-sm text-stone-500">years behind the chair</p>
        </div>
        <div data-stat className="text-center sm:text-left">
          <p className="font-display text-4xl text-stone-900 dark:text-stone-50">Patch</p>
          <p className="mt-1 text-sm text-stone-500">tests always, no exceptions</p>
        </div>
        <div data-stat className="text-center sm:text-left">
          <p className="font-display text-4xl text-stone-900 dark:text-stone-50">Text</p>
          <p className="mt-1 text-sm text-stone-500">back when we are mixing, not ignoring</p>
        </div>
      </section>

      {/* ========== Footer CTA ==========
          Final message + primary actions (LandingFooterCta) */}
      <section className="relative rounded-2xl bg-stone-900 px-6 py-12 text-center text-stone-50 dark:bg-stone-900 sm:px-10 sm:py-14">
        <div data-footer-line className="absolute left-6 right-6 top-0 h-px bg-gradient-to-r from-transparent via-rose-400/50 to-transparent sm:left-10 sm:right-10" />
        <h2 className="font-display text-2xl sm:text-3xl">Come as you are—tangles welcome.</h2>
        <p className="mx-auto mt-3 max-w-lg text-sm text-stone-400">
          If you are new, tell us what last went wrong with your color. We actually want to know.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <LandingFooterCta />
        </div>
      </section>
    </div>
  );
}
