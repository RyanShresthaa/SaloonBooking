import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock, ClipboardList, MessageCircle, Sparkles } from 'lucide-react';
import Button from '@/components/ui/Button';
import { getDemoCalendarUrl, getDemoContactEmail } from '@/lib/demoBooking';

const steps = [
  {
    title: 'Diary, not slides',
    body: 'We walk through real booking flows—double-books, buffers, and the quiet “oops” moments salons hit every week.',
  },
  {
    title: 'Your questions first',
    body: 'Bring your current stack, chair count, and what slows Saturdays. We keep it conversational, not a script.',
  },
  {
    title: 'No pressure wrap-up',
    body: 'You leave with a clear sense of fit. If it is not the right season, you still have the notes.',
  },
] as const;

function buildMailtoBody(fields: {
  name: string;
  email: string;
  salon: string;
  role: string;
  message: string;
}) {
  return [
    'Salon desk — demo request',
    '---',
    `Name: ${fields.name}`,
    `Email: ${fields.email}`,
    `Salon / studio: ${fields.salon}`,
    `Role: ${fields.role}`,
    '',
    'Notes:',
    fields.message || '(none)',
  ].join('\n');
}

export default function DemoPage() {
  const calendarUrl = getDemoCalendarUrl();
  const contactEmail = getDemoContactEmail();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [salon, setSalon] = useState('');
  const [role, setRole] = useState('owner');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [copiedHint, setCopiedHint] = useState(false);

  const resetForm = () => {
    setName('');
    setEmail('');
    setSalon('');
    setRole('owner');
    setMessage('');
    setError('');
    setSent(false);
    setCopiedHint(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const n = name.trim();
    const em = email.trim();
    const s = salon.trim();
    if (!n || !em || !s) {
      setError('Please add your name, work email, and salon or studio name.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      setError('Please use a valid email address.');
      return;
    }

    const body = buildMailtoBody({ name: n, email: em, salon: s, role, message: message.trim() });
    const subject = encodeURIComponent(`Demo request — ${s}`);
    const encodedBody = encodeURIComponent(body);

    if (contactEmail) {
      window.location.href = `mailto:${contactEmail}?subject=${subject}&body=${encodedBody}`;
      setSent(true);
      return;
    }

    try {
      await navigator.clipboard.writeText(body);
      setCopiedHint(true);
    } catch {
      setCopiedHint(false);
    }
    setSent(true);
  };

  if (sent) {
    return (
      <div className="mx-auto max-w-lg space-y-8 py-6 text-center sm:py-10">
        <div className="surface-card rounded-2xl border-rose-200/40 p-8 dark:border-rose-900/35">
          <p className="page-eyebrow text-rose-900/85 dark:text-rose-200/90">
            Thank you
          </p>
          <h1 className="font-display mt-4 text-2xl text-stone-900 dark:text-stone-50 sm:text-3xl">
            {contactEmail ? 'Your mail app should open next.' : 'Details captured.'}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-stone-600 dark:text-stone-400">
            {contactEmail
              ? 'Send the message when it is ready — we reply within a couple of business days.'
              : copiedHint
                ? 'We copied your request to the clipboard. Paste it into an email to your team or to us when you are ready.'
                : 'Copy failed in this browser — jot down your note and reach out when you can.'}
          </p>
          {!contactEmail ? (
            <p className="mt-4 rounded-lg bg-amber-50/90 px-3 py-2 text-xs text-amber-950 dark:bg-amber-950/40 dark:text-amber-100">
              Tip: set <code className="font-mono text-[11px]">VITE_DEMO_CONTACT_EMAIL</code> in{' '}
              <code className="font-mono text-[11px]">frontend/.env.local</code> so guests get a one-tap email draft.
            </p>
          ) : null}
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button type="button" variant="secondary" onClick={resetForm}>
              Send another
            </Button>
            <Link to="/" className="inline-flex items-center justify-center rounded-md border border-stone-900 bg-stone-900 px-4 py-2.5 text-sm font-semibold text-stone-50 transition hover:bg-stone-800 focus-ring dark:border-stone-100 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200">
              Back home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="demo-page pb-16">
      <div className="relative overflow-hidden rounded-2xl border border-stone-200/80 bg-gradient-to-br from-[#f3eee6] via-[#faf8f5] to-[#ebe4d9] px-6 py-12 dark:border-stone-700/80 dark:from-stone-950 dark:via-stone-950 dark:to-stone-900 sm:px-10 sm:py-14">
        <div
          className="pointer-events-none absolute -right-24 top-0 h-72 w-72 rounded-full bg-rose-200/30 blur-3xl dark:bg-rose-900/12"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -left-16 bottom-0 h-56 w-56 rounded-full bg-stone-200/35 blur-2xl dark:bg-stone-800/25"
          aria-hidden
        />

        <div className="relative mx-auto max-w-3xl text-center">
          <p className="page-eyebrow text-rose-900/80 dark:text-rose-200/90">
            Salon desk · walkthrough
          </p>
          <h1 className="font-display mt-4 text-[2rem] font-medium leading-[1.08] tracking-[-0.03em] text-stone-900 dark:text-stone-50 sm:text-4xl lg:text-[2.75rem]">
            See the diary in motion—
            <span className="text-rose-800 dark:text-rose-300"> without the showroom gloss.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-stone-600 dark:text-stone-400">
            A calm, live look at how appointments, waitlists, and day-of messages hang together. Built for teams who
            prefer honesty over hype.
          </p>
        </div>

        {calendarUrl ? (
          <div className="relative mx-auto mt-10 max-w-xl">
            <a
              href={calendarUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-4 rounded-2xl border border-stone-900/10 bg-white/90 p-5 shadow-sm transition hover:border-rose-300/60 hover:shadow-md dark:border-stone-600/60 dark:bg-stone-900/80 dark:hover:border-rose-800/50"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-stone-900 text-rose-100 dark:bg-stone-100 dark:text-stone-900">
                <CalendarClock className="h-6 w-6" strokeWidth={1.5} aria-hidden />
              </span>
              <span className="min-w-0 text-left">
                <span className="block font-display text-lg text-stone-900 dark:text-stone-50">Pick a time</span>
                <span className="mt-0.5 block text-sm text-stone-600 dark:text-stone-400">
                  Opens your calendar link in a new tab — then tell us anything we should prep.
                </span>
              </span>
              <span className="ml-auto hidden shrink-0 text-sm font-semibold text-rose-800 group-hover:underline sm:inline dark:text-rose-300">
                Continue
              </span>
            </a>
          </div>
        ) : null}
      </div>

      <div className="mx-auto mt-14 grid max-w-5xl gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:gap-16">
        <div className="space-y-10">
          <section>
            <h2 className="font-display text-2xl text-stone-900 dark:text-stone-50">What the call feels like</h2>
            <ul className="mt-6 space-y-8 border-l-2 border-rose-300/70 pl-6 dark:border-rose-800/60">
              {steps.map((step, i) => (
                <li key={step.title}>
                  <p className="page-eyebrow">
                    Step {i + 1}
                  </p>
                  <p className="font-display mt-1 text-lg text-stone-900 dark:text-stone-100">{step.title}</p>
                  <p className="mt-2 text-sm leading-relaxed text-stone-600 dark:text-stone-400">{step.body}</p>
                </li>
              ))}
            </ul>
          </section>

          <section className="grid gap-4 sm:grid-cols-3">
            {[
              { icon: Sparkles, label: 'Warm UI', text: 'Readable type, soft contrast—built for tired eyes after a double shift.' },
              { icon: ClipboardList, label: 'One thread', text: 'Booking, waitlist, and nudges share the same story of the day.' },
              { icon: MessageCircle, label: 'Human tone', text: 'Defaults sound like your front desk, not a ticket robot.' },
            ].map(({ icon: Icon, label, text }) => (
              <div
                key={label}
                className="surface-card rounded-xl border-stone-200/80 p-4 dark:border-stone-700/80"
              >
                <Icon className="h-5 w-5 text-rose-600 dark:text-rose-400" strokeWidth={1.5} aria-hidden />
                <p className="mt-3 font-display text-sm text-stone-900 dark:text-stone-50">{label}</p>
                <p className="mt-1 text-xs leading-relaxed text-stone-600 dark:text-stone-400">{text}</p>
              </div>
            ))}
          </section>
        </div>

        <div className="lg:pt-2">
          <div className="surface-card sticky top-24 rounded-2xl border-stone-200/90 p-6 shadow-sm dark:border-stone-700/90 sm:p-7">
            <h2 className="font-display text-xl text-stone-900 dark:text-stone-50">Request a walkthrough</h2>
            <p className="mt-2 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
              {calendarUrl
                ? 'Prefer email first? Drop a note—we’ll match you to the right slot.'
                : 'Tell us who you are. We’ll follow up with times that fit your week.'}
            </p>

            {error ? (
              <p className="mt-4 rounded-md border border-red-200/90 bg-red-50/90 px-3 py-2 text-xs text-red-900 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-100">
                {error}
              </p>
            ) : null}

            <form onSubmit={submit} className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="demo-name" className="section-label">
                  Name
                </label>
                <input
                  id="demo-name"
                  name="name"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus-ring dark:border-stone-600 dark:bg-stone-950 dark:text-stone-100"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="demo-email" className="section-label">
                  Work email
                </label>
                <input
                  id="demo-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus-ring dark:border-stone-600 dark:bg-stone-950 dark:text-stone-100"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="demo-salon" className="section-label">
                  Salon or studio
                </label>
                <input
                  id="demo-salon"
                  name="salon"
                  autoComplete="organization"
                  value={salon}
                  onChange={(e) => setSalon(e.target.value)}
                  className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus-ring dark:border-stone-600 dark:bg-stone-950 dark:text-stone-100"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="demo-role" className="section-label">
                  Your role
                </label>
                <select
                  id="demo-role"
                  name="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus-ring dark:border-stone-600 dark:bg-stone-950 dark:text-stone-100"
                >
                  <option value="owner">Owner / director</option>
                  <option value="manager">Manager</option>
                  <option value="front_desk">Front desk</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="demo-message" className="section-label">
                  What should we prep? <span className="font-normal normal-case tracking-normal text-stone-400">(optional)</span>
                </label>
                <textarea
                  id="demo-message"
                  name="message"
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full resize-none rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus-ring dark:border-stone-600 dark:bg-stone-950 dark:text-stone-100"
                  placeholder="Chairs, locations, current software…"
                />
              </div>
              <Button type="submit" className="w-full sm:w-auto">
                {contactEmail ? 'Open email draft' : 'Copy request & continue'}
              </Button>
            </form>
          </div>
        </div>
      </div>

      <p className="mx-auto mt-12 max-w-2xl text-center text-xs text-stone-500 dark:text-stone-500">
        Prefer to explore solo?{' '}
        <Link to="/register" className="link-quiet font-medium text-stone-700 dark:text-stone-300">
          Create a sandbox account
        </Link>{' '}
        or{' '}
        <Link to="/appointments/new" className="link-quiet font-medium text-stone-700 dark:text-stone-300">
          try guest booking
        </Link>
        .
      </p>
    </div>
  );
}
