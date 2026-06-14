import { useEffect, useLayoutEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Calendar, Heart, Sparkles, Sun } from 'lucide-react';
import HeroAuthCTA from '@/components/home/HeroAuthCTA';
import { useAuthStore } from '@/store/authStore';

gsap.registerPlugin(ScrollTrigger);

const COOLDOWN_MS = 150;

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

const MARQUEE_WORDS = ['Cut & color', 'Silk press', 'Scalp reset', 'Same-day text'];

const SERVICES = [
  { icon: Sparkles, title: 'Cut & style', blurb: 'Shapes that grow out kindly — so you still like your hair six weeks later.' },
  { icon: Sun,      title: 'Color',       blurb: 'Balayage, gloss, and corrections with honest timing and patch tests.' },
  { icon: Heart,    title: 'Treatments',  blurb: 'Silk presses, masks, and scalp care when your hair needs a quiet reset.' },
  { icon: Calendar, title: 'Booking',     blurb: 'Same-day notes, running-late texts, and a diary that does not panic.' },
] as const;

const STATS = [
  { value: '12+',   label: 'years behind the chair' },
  { value: 'Patch', label: 'tests always, no exceptions' },
  { value: 'Text',  label: 'back when we are mixing, not ignoring' },
] as const;

function MarqueeContent() {
  return (
    <span className="inline-flex items-center gap-10 px-6 text-xs font-medium tracking-[0.2em] text-stone-400">
      {MARQUEE_WORDS.map((word, i) => (
        <span key={word} className="inline-flex items-center gap-10">
          <span>{word}</span>
          {i < MARQUEE_WORDS.length - 1 && <span className="text-rose-300/90">·</span>}
        </span>
      ))}
      <span className="text-rose-300/90">·</span>
    </span>
  );
}

type CtaVariant = 'primary' | 'ghost';

function CtaLink({ to, variant = 'primary', children }: { to: string; variant?: CtaVariant; children: React.ReactNode }) {
  const base = 'inline-flex items-center justify-center rounded-md px-5 py-2.5 text-sm font-medium transition focus-ring';
  const styles: Record<CtaVariant, string> = {
    primary: 'border border-rose-200/50 bg-rose-50 text-stone-900 hover:bg-rose-100/90',
    ghost:   'border border-stone-500/90 bg-transparent text-stone-100 hover:border-stone-400 hover:bg-stone-800/60',
  };
  return <Link to={to} className={`${base} ${styles[variant]}`}>{children}</Link>;
}

function FooterCta() {
  const { isAuthenticated, hydrate } = useAuthStore();
  const hydrateRef = useRef(hydrate);
  useEffect(() => { hydrateRef.current = hydrate; });
  useEffect(() => { hydrateRef.current(); }, []);

  if (isAuthenticated) {
    return <CtaLink to="/appointments">Open appointments</CtaLink>;
  }
  return (
    <>
      <CtaLink to="/register">Create account</CtaLink>
      <CtaLink to="/demo" variant="ghost">Book a demo</CtaLink>
      <CtaLink to="/login" variant="ghost">Staff sign in</CtaLink>
    </>
  );
}

export default function SalonLanding() {
  const rootRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || prefersReducedMotion()) return;

    const ctx = gsap.context(() => {
      const heroLines  = gsap.utils.toArray<HTMLElement>(root.querySelectorAll('[data-hero-line]'));
      const heroMeta   = root.querySelectorAll('[data-hero-meta]');
      const heroCta    = root.querySelector('[data-hero-cta]');
      const heroVisual = root.querySelector('[data-hero-visual]');
      const blobs      = root.querySelectorAll('[data-blob]');
      const revealEls  = root.querySelectorAll('[data-reveal]');
      const statEls    = root.querySelectorAll('[data-stat]');
      const footLine   = root.querySelector('[data-footer-line]');

      gsap
        .timeline({ defaults: { ease: 'power3.out' } })
        .from(heroLines,  { yPercent: 108, duration: 0.95, stagger: 0.11, skewY: 2 })
        .from(heroMeta,   { y: 18, opacity: 0, duration: 0.55, stagger: 0.08 }, '-=0.55')
        .from(heroCta,    { y: 22, opacity: 0, duration: 0.60, ease: 'power2.out' }, '-=0.35')
        .from(heroVisual, { scale: 0.94, opacity: 0, duration: 0.75, ease: 'power2.out' }, '-=0.75');

      blobs.forEach((blob, i) => {
        gsap.to(blob, {
          y: 22 + i * 8,
          x: i % 2 === 0 ? 10 + i * 6 : -(10 + i * 6),
          duration: 5.5 + i * 1.4,
          ease: 'sine.inOut',
          repeat: -1,
          yoyo: true,
        });
      });

      revealEls.forEach((el) => {
        gsap.from(el, {
          y: 42, opacity: 0, duration: 0.75, ease: 'power2.out',
          scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none none' },
        });
      });

      statEls.forEach((el, i) => {
        gsap.from(el, {
          y: 20, opacity: 0, duration: 0.55, delay: i * 0.06, ease: 'power2.out',
          scrollTrigger: { trigger: el, start: 'top 90%', toggleActions: 'play none none none' },
        });
      });

      if (footLine) {
        gsap.from(footLine, {
          scaleX: 0, transformOrigin: 'left center', duration: 1.1, ease: 'power2.inOut',
          scrollTrigger: { trigger: footLine, start: 'top 92%', toggleActions: 'play none none none' },
        });
      }
    }, root);

    let resizeTimer: ReturnType<typeof setTimeout>;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => ScrollTrigger.refresh(), COOLDOWN_MS);
    };
    window.addEventListener('resize', onResize);

    return () => {
      clearTimeout(resizeTimer);
      window.removeEventListener('resize', onResize);
      ctx.revert();
    };
  }, []);

  return (
    <div ref={rootRef} className="customer-landing overflow-hidden pb-20">

      {/* Hero */}
      <section className="relative left-1/2 mb-20 w-screen max-w-none -translate-x-1/2 px-4 pb-16 pt-2 sm:px-6 sm:pb-20 sm:pt-4">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-gradient-to-b from-[#f5f0e8] via-[#faf8f5] to-[#f3efe8] dark:from-stone-950 dark:via-stone-950 dark:to-stone-950" />
        <div data-blob aria-hidden className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-rose-200/35 blur-3xl dark:bg-rose-900/12" />
        <div data-blob aria-hidden className="pointer-events-none absolute -right-16 bottom-0 h-80 w-80 rounded-full bg-amber-100/40 blur-3xl dark:bg-amber-950/15" />
        <div data-blob aria-hidden className="pointer-events-none absolute left-1/3 top-1/2 h-48 w-48 -translate-y-1/2 rounded-full bg-stone-200/35 blur-2xl dark:bg-stone-800/25" />

        <div className="mx-auto grid max-w-6xl gap-12 px-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16">
          <div className="relative z-10">
            <p data-hero-meta className="mb-5 page-eyebrow">Independent salon · city hours</p>

            <h1 className="font-display text-[2.35rem] font-medium leading-[1.05] tracking-[-0.03em] text-stone-900 dark:text-stone-50 sm:text-5xl lg:text-[3.25rem]">
              <span className="block overflow-hidden pb-1"><span data-hero-line className="block">Hair that feels</span></span>
              <span className="block overflow-hidden pb-1"><span data-hero-line className="block text-rose-900/90 dark:text-rose-200/95">like yours,</span></span>
              <span className="block overflow-hidden pb-1"><span data-hero-line className="block">only calmer.</span></span>
            </h1>

            <p data-hero-meta className="mt-7 max-w-md text-base leading-relaxed text-stone-600 dark:text-stone-400">
              We keep color notes, patch tests, and the small preferences you mention once — so every visit picks up where the last one ended.
            </p>

            <div data-hero-cta className="mt-9"><HeroAuthCTA /></div>

            <p data-hero-meta className="mt-8 text-sm text-stone-500 dark:text-stone-500">
              Walk-ins when we can ·{' '}
              <Link to="/marketplace" className="link-quiet font-medium">Book ahead when you cannot</Link>
              <span className="mx-1.5 text-stone-400 dark:text-stone-600" aria-hidden>·</span>
              <Link to="/demo" className="link-quiet font-medium">Running the desk? Book a walkthrough</Link>
            </p>
          </div>

          <div data-hero-visual className="relative isolate flex min-h-[280px] items-stretch lg:min-h-[360px]">
            <div className="surface-card relative flex w-full flex-col justify-between overflow-hidden rounded-xl border-stone-200/80 bg-[#fffefb] p-7 shadow-sm dark:border-stone-700/80 dark:bg-stone-900/80 sm:p-9">
              <div aria-hidden className="absolute right-6 top-6 h-24 w-24 rounded-full border border-rose-200/60 dark:border-rose-800/50" />
              <div aria-hidden className="absolute -bottom-8 -left-8 h-40 w-40 rounded-full bg-gradient-to-tr from-rose-100/90 to-transparent dark:from-rose-900/40" />
              <p className="font-display relative max-w-[14rem] text-xl italic leading-snug text-stone-800 dark:text-stone-200 sm:text-2xl">
                &ldquo;Warm water, honest timing, and nobody rushing the toner.&rdquo;
              </p>
              <div className="relative mt-10 flex items-end justify-between gap-4 border-t border-stone-200/80 pt-6 dark:border-stone-700/80">
                <div>
                  <p className="text-xs font-medium text-stone-500 dark:text-stone-400">Next quiet slot</p>
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

      {/* Marquee */}
      <div aria-hidden className="landing-marquee-animate relative left-1/2 mb-16 w-screen max-w-none -translate-x-1/2 overflow-hidden border-y border-stone-200/80 bg-stone-900 py-3 text-stone-50 dark:border-stone-800">
        <div className="landing-marquee-track">
          <MarqueeContent />
          <MarqueeContent />
        </div>
      </div>

      {/* Services */}
      <section aria-label="Services" className="mb-20 grid gap-10 lg:grid-cols-3 lg:gap-12">
        <div data-reveal className="lg:col-span-1">
          <h2 className="font-display text-3xl tracking-tight text-stone-900 dark:text-stone-50">Small shop habits.</h2>
          <p className="mt-4 text-stone-600 dark:text-stone-400">
            We write things down, use timers we trust, and say no when a service needs another day. Boring in the best way.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
          {SERVICES.map(({ icon: Icon, title, blurb }) => (
            <article key={title} data-reveal className="group surface-card rounded-xl border-stone-200/90 p-6 transition-[border-color,box-shadow] duration-300 hover:border-rose-200/80 hover:shadow-md dark:border-stone-700/90 dark:hover:border-rose-900/50">
              <Icon aria-hidden className="mb-4 h-6 w-6 text-rose-600 transition-transform duration-300 group-hover:scale-110 dark:text-rose-400" strokeWidth={1.5} />
              <h3 className="font-display text-xl text-stone-900 dark:text-stone-100">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-600 dark:text-stone-400">{blurb}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Testimonial */}
      <section data-reveal aria-label="What clients say" className="relative mb-20 overflow-hidden rounded-2xl border border-stone-200/90 bg-gradient-to-br from-stone-50 to-white px-6 py-14 dark:border-stone-700/90 dark:from-stone-900 dark:to-stone-950 sm:px-12 sm:py-16">
        <div aria-hidden className="pointer-events-none absolute -right-20 top-0 h-64 w-64 rounded-full bg-rose-100/50 blur-3xl dark:bg-rose-900/25" />
        <div className="relative mx-auto max-w-2xl text-center">
          <p className="page-eyebrow text-rose-800/90 dark:text-rose-300/90">From the floor</p>
          <p className="font-display mt-6 text-2xl italic leading-snug text-stone-800 dark:text-stone-200 sm:text-3xl">
            &ldquo;The best compliment is when someone&apos;s mum books off their recommendation.&rdquo;
          </p>
          <p className="mt-6 text-sm text-stone-500">— Floor lead, Saturday shift</p>
        </div>
      </section>

      {/* Stats */}
      <section aria-label="At a glance" className="mb-16 grid gap-6 border-t border-stone-200/80 pt-12 dark:border-stone-800 sm:grid-cols-3">
        {STATS.map(({ value, label }) => (
          <div key={value} data-stat className="text-center sm:text-left">
            <p className="font-display text-4xl text-stone-900 dark:text-stone-50">{value}</p>
            <p className="mt-1 text-sm text-stone-500">{label}</p>
          </div>
        ))}
      </section>

      {/* Footer CTA */}
      <section aria-label="Get started" className="relative rounded-2xl bg-stone-900 px-6 py-12 text-center text-stone-50 sm:px-10 sm:py-14">
        <div data-footer-line aria-hidden className="absolute left-6 right-6 top-0 h-px bg-gradient-to-r from-transparent via-rose-400/50 to-transparent sm:left-10 sm:right-10" />
        <h2 className="font-display text-2xl sm:text-3xl">Come as you are — tangles welcome.</h2>
        <p className="mx-auto mt-3 max-w-lg text-sm text-stone-400">
          If you are new, tell us what last went wrong with your color. We actually want to know.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <FooterCta />
        </div>
      </section>

    </div>
  );
}