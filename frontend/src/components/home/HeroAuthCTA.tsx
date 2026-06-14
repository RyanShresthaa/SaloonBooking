import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

export default function HeroAuthCTA() {
  const { isAuthenticated, hydrate } = useAuthStore();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  if (isAuthenticated) {
    return (
      <div className="flex flex-wrap items-center gap-3 pt-2">
        <Link
          to="/appointments"
          className="inline-flex items-center justify-center rounded-md border border-stone-900 bg-stone-900 px-5 py-2.5 text-sm font-medium text-stone-50 transition hover:bg-stone-800 focus-ring"
        >
          Open appointments
        </Link>
        <Link
          to="/demo"
          className="inline-flex items-center justify-center rounded-md border border-stone-400 bg-[#fffefb] px-5 py-2.5 text-sm font-medium text-stone-800 transition hover:border-stone-500 hover:bg-white focus-ring dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100 dark:hover:border-stone-500 dark:hover:bg-stone-800"
        >
          Book a walkthrough
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3 pt-2">
      <Link
        to="/register"
        className="inline-flex items-center justify-center rounded-md border border-stone-900 bg-stone-900 px-5 py-2.5 text-sm font-medium text-stone-50 transition hover:bg-stone-800 focus-ring"
      >
        Create account
      </Link>
      <Link
        to="/login"
        className="inline-flex items-center justify-center rounded-md border border-stone-400 bg-[#fffefb] px-5 py-2.5 text-sm font-medium text-stone-800 transition hover:border-stone-500 hover:bg-white focus-ring dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100 dark:hover:bg-stone-800"
      >
        Sign in
      </Link>
      <Link
        to="/demo"
        className="inline-flex items-center justify-center rounded-md border border-stone-500 bg-transparent px-5 py-2.5 text-sm font-medium text-stone-800 transition hover:bg-stone-900/5 focus-ring dark:border-stone-500 dark:text-stone-200 dark:hover:bg-stone-100/5"
      >
        Book a demo
      </Link>
    </div>
  );
}
