import { useEffect, useLayoutEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  CalendarCheck,
  Crown,
  FlaskConical,
  Link2,
  Palette,
  Scissors,
  UserRound,
} from 'lucide-react';
import HeroAuthCTA from '@/components/home/HeroAuthCTA';
import { LANDING_IMAGES } from '@/components/home/landingImages';
import { useAuthStore } from '@/store/authStore';

gsap.registerPlugin(ScrollTrigger);

const COOLDOWN_MS = 150;

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

const MARQUEE_WORDS = ['Cut & color', 'Silk press', 'Scalp reset', 'Same-day text'];

const SERVICE_FEATURES = [
  {
    icon: Palette,
    title: 'Hair coloring',
    description:
      'Balayage, highlights, babylights, and full color with clear timing, strand tests, and aftercare you can follow at home.',
  },
  {
    icon: FlaskConical,
    title: 'Hair treatments',
    description:
      'Keratin smoothing, deep conditioning masks, bond builders, and scalp care when your hair needs strength, shine, or relief.',
  },
  {
    icon: Scissors,
    title: 'Haircuts & styling',
    description:
      'Precision cuts for every texture, polished blowouts, and editorial updos — shaped to your face, routine, and grow-out plan.',
  },
  {
    icon: Link2,
    title: 'Extensions & texture',
    description:
      'Tape-ins, sew-ins, blending, and curl or wave shaping so length and volume look natural, secure, and easy to maintain.',
  },
  {
    icon: Crown,
    title: 'Bridal & events',
    description:
      'Trials, wedding-morning styling, and party-ready looks that photograph well and stay comfortable through the last dance.',
  },
  {
    icon: UserRound,
    title: "Men's grooming",
    description:
      'Fades, tapers, beard trims, and shape-ups with hot towels and detail work so the neckline and edges stay sharp longer.',
  },
  {
    icon: CalendarCheck,
    title: 'Consultations',
    description:
      'Patch tests, color corrections, and honest plans before we open a bowl — so goals, budget, and maintenance all line up.',
  },
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
  const base =
    'inline-flex w-full items-center justify-center rounded-md px-5 py-2.5 text-sm font-medium transition focus-ring sm:w-auto';
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
    <div ref={rootRef} className="customer-landing overflow-hidden pb-16 md:pb-24">

      {/* Hero — split copy + photography */}
      <section className="relative left-1/2 w-screen max-w-none -translate-x-1/2 overflow-hidden border-b border-stone-200/70 dark:border-stone-800">
        <div className="absolute inset-0 z-0">
          <img
            src={LANDING_IMAGES.hero}
            alt=""
            className="h-full min-h-[22rem] w-full object-cover object-center sm:min-h-[26rem] lg:min-h-[28rem]"
            loading="eager"
            decoding="async"
          />
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-r from-[#faf8f5] via-[#faf8f5]/95 to-[#faf8f5]/55 dark:from-stone-950 dark:via-stone-950/92 dark:to-stone-950/40 lg:via-[#faf8f5]/88 lg:to-transparent dark:lg:via-stone-950/85 dark:lg:to-stone-950/25"
          />
        </div>
        <div data-blob aria-hidden className="pointer-events-none absolute -left-20 top-16 z-[1] h-64 w-64 rounded-full bg-rose-200/30 blur-3xl dark:bg-rose-900/15" />
        <div data-blob aria-hidden className="pointer-events-none absolute bottom-10 right-10 z-[1] h-56 w-56 rounded-full bg-amber-100/35 blur-3xl dark:bg-amber-950/20" />

        <div className="relative z-[2] mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 sm:px-6 sm:py-16 md:py-20 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-12 lg:py-24">
          <div>
            <p data-hero-meta className="mb-4 page-eyebrow">Independent salon · city hours</p>

            <h1 className="font-display text-[2.35rem] font-medium leading-[1.05] tracking-[-0.03em] text-stone-900 dark:text-stone-50 sm:text-5xl lg:text-[3.25rem]">
              <span className="block overflow-hidden pb-1"><span data-hero-line className="block">Hair that feels</span></span>
              <span className="block overflow-hidden pb-1"><span data-hero-line className="block text-rose-900/90 dark:text-rose-200/95">like yours,</span></span>
              <span className="block overflow-hidden pb-1"><span data-hero-line className="block">only calmer.</span></span>
            </h1>

            <p data-hero-meta className="mt-6 max-w-md text-base leading-relaxed text-stone-700 dark:text-stone-300">
              We keep color notes, patch tests, and the small preferences you mention once — so every visit picks up where the last one ended.
            </p>

            <div data-hero-cta className="mt-8"><HeroAuthCTA /></div>

            <p data-hero-meta className="mt-6 text-sm text-stone-600 dark:text-stone-400">
              Walk-ins when we can ·{' '}
              <Link to="/marketplace" className="link-quiet font-medium">Book ahead when you cannot</Link>
              <span className="mx-1.5 text-stone-400 dark:text-stone-600" aria-hidden>·</span>
              <Link to="/demo" className="link-quiet font-medium">Running the desk? Book a walkthrough</Link>
            </p>
          </div>

          <div data-hero-visual className="relative hidden min-h-[240px] lg:block">
            <div className="relative h-full min-h-[280px] overflow-hidden rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.25)] ring-1 ring-black/10 dark:ring-white/10">
              <img
                src={LANDING_IMAGES.heroAccent}
                alt="Salon chairs and styling stations"
                className="h-full w-full object-cover"
                loading="lazy"
                decoding="async"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent p-6 pt-16">
                <p className="font-display max-w-[16rem] text-lg italic leading-snug text-white drop-shadow-sm sm:text-xl">
                  &ldquo;Warm water, honest timing, and nobody rushing the toner.&rdquo;
                </p>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-white/95">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wider text-white/75">Next quiet slot</p>
                    <p className="mt-0.5 font-display text-xl">Thu · 2:40</p>
                  </div>
                  <span className="rounded-full bg-white/15 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide ring-1 ring-white/25 backdrop-blur-sm">
                    Low noise
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile — salon photo strip (split hero panel is lg+ only) */}
        <div className="relative z-[2] mt-8 px-4 pb-10 sm:px-6 lg:hidden">
          <div className="mx-auto max-w-6xl overflow-hidden rounded-xl ring-1 ring-black/10 dark:ring-white/10">
            <img
              src={LANDING_IMAGES.heroAccent}
              alt="Salon interior"
              className="aspect-[16/10] w-full object-cover"
              loading="lazy"
              decoding="async"
            />
          </div>
        </div>
      </section>

      {/* Marquee */}
      <div
        aria-hidden
        className="landing-marquee-animate relative left-1/2 w-screen max-w-none -translate-x-1/2 overflow-hidden border-b border-stone-200/80 bg-stone-900 py-3 text-stone-50 dark:border-stone-800"
      >
        <div className="landing-marquee-track">
          <MarqueeContent />
          <MarqueeContent />
        </div>
      </div>

      {/* Services / features */}
      <section
        aria-label="Salon services"
        className="border-b border-stone-200/60 bg-[#faf8f5]/90 px-4 py-16 dark:border-stone-800/80 dark:bg-stone-950/50 sm:px-6 md:py-24"
      >
        <div className="mx-auto max-w-6xl">
          <div data-reveal className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl tracking-tight text-stone-900 dark:text-stone-50 sm:text-4xl">
              Services we live in every day
            </h2>
            <p className="mt-4 text-base leading-relaxed text-stone-600 dark:text-stone-400">
              From lived-in color to event-ready finishes — here is what we book most, with room on the card for the
              details that matter to your hair.
            </p>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
            {SERVICE_FEATURES.map(({ icon: Icon, title, description }) => (
              <article
                key={title}
                data-reveal
                className="group flex min-h-[220px] flex-col rounded-xl border border-stone-200/90 bg-[#fffefb] px-6 py-8 shadow-sm transition-[border-color,box-shadow,transform] duration-300 hover:border-rose-200/80 hover:shadow-md dark:border-stone-700/90 dark:bg-stone-900/80 dark:hover:border-rose-900/50 sm:min-h-[240px]"
              >
                <div className="mb-5 inline-flex rounded-lg bg-rose-50 p-3 text-rose-700 ring-1 ring-rose-100/80 dark:bg-rose-950/50 dark:text-rose-200 dark:ring-rose-900/40">
                  <Icon aria-hidden className="h-7 w-7 transition-transform duration-300 group-hover:scale-105" strokeWidth={1.5} />
                </div>
                <h3 className="font-display text-xl leading-snug text-stone-900 dark:text-stone-100">{title}</h3>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-stone-600 dark:text-stone-400">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Photo strip — between services and social proof */}
      <section aria-label="Salon gallery" className="border-b border-stone-200/60 bg-white px-4 py-16 dark:border-stone-800/80 dark:bg-stone-950 sm:px-6 md:py-24">
        <div className="mx-auto max-w-6xl space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
            <div className="overflow-hidden rounded-xl ring-1 ring-stone-200/80 dark:ring-stone-700/80">
              <img
                src={LANDING_IMAGES.galleryColor}
                alt="Hair colour and highlights in progress"
                className="aspect-[4/3] h-full w-full object-cover"
                loading="lazy"
                decoding="async"
              />
            </div>
            <div className="overflow-hidden rounded-xl ring-1 ring-stone-200/80 dark:ring-stone-700/80">
              <img
                src={LANDING_IMAGES.galleryInterior}
                alt="Salon interior and styling area"
                className="aspect-[4/3] h-full w-full object-cover"
                loading="lazy"
                decoding="async"
              />
            </div>
            <div className="overflow-hidden rounded-xl ring-1 ring-stone-200/80 dark:ring-stone-700/80">
              <img
                src={LANDING_IMAGES.galleryClient}
                alt="Client in salon chair"
                className="aspect-[4/3] h-full w-full object-cover"
                loading="lazy"
                decoding="async"
              />
            </div>
          </div>
          <div className="overflow-hidden rounded-xl ring-1 ring-stone-200/80 dark:ring-stone-700/80">
            <img
              src={LANDING_IMAGES.banner}
              alt="Salon atmosphere"
              className="aspect-[21/9] max-h-[min(22rem,40vw)] w-full object-cover sm:max-h-none"
              loading="lazy"
              decoding="async"
            />
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section
        data-reveal
        aria-label="What clients say"
        className="relative border-b border-stone-200/60 bg-stone-50/90 px-4 py-16 dark:border-stone-800/80 dark:bg-stone-900/40 sm:px-6 md:py-24"
      >
        <div className="mx-auto max-w-6xl">
          <div className="relative overflow-hidden rounded-2xl border border-stone-200/90 bg-gradient-to-br from-white to-stone-50/80 px-6 py-14 dark:border-stone-700/90 dark:from-stone-900 dark:to-stone-950 sm:px-12 sm:py-16">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-20 top-0 h-64 w-64 rounded-full bg-rose-100/50 blur-3xl dark:bg-rose-900/25"
            />
            <div className="relative mx-auto max-w-2xl text-center">
              <p className="page-eyebrow text-rose-800/90 dark:text-rose-300/90">From the floor</p>
              <p className="font-display mt-6 text-2xl italic leading-snug text-stone-800 dark:text-stone-200 sm:text-3xl">
                &ldquo;The best compliment is when someone&apos;s mum books off their recommendation.&rdquo;
              </p>
              <p className="mt-6 text-sm text-stone-500 dark:text-stone-400">— Floor lead, Saturday shift</p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section
        aria-label="At a glance"
        className="grid gap-8 border-b border-stone-200/60 bg-white px-4 py-16 dark:border-stone-800/80 dark:bg-stone-950 sm:grid-cols-3 sm:px-6 md:py-24"
      >
        {STATS.map(({ value, label }) => (
          <div key={value} data-stat className="text-center sm:text-left">
            <p className="font-display text-4xl text-stone-900 dark:text-stone-50">{value}</p>
            <p className="mt-1 text-sm text-stone-500">{label}</p>
          </div>
        ))}
      </section>

      {/* Footer CTA */}
      <section
        aria-label="Get started"
        className="relative mx-4 rounded-2xl bg-stone-900 px-6 py-16 text-center text-stone-50 sm:mx-6 sm:px-10 md:py-24"
      >
        <div data-footer-line aria-hidden className="absolute left-6 right-6 top-0 h-px bg-gradient-to-r from-transparent via-rose-400/50 to-transparent sm:left-10 sm:right-10" />
        <h2 className="font-display text-2xl sm:text-3xl">Come as you are — tangles welcome.</h2>
        <p className="mx-auto mt-3 max-w-lg text-sm text-stone-400">
          If you are new, tell us what last went wrong with your color. We actually want to know.
        </p>
        <div className="mx-auto mt-8 flex max-w-md flex-col items-stretch gap-3 sm:max-w-none sm:flex-row sm:flex-wrap sm:justify-center">
          <FooterCta />
        </div>
      </section>

    </div>
  );
}