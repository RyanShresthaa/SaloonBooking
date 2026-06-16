import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

const btnBase =
  'inline-flex w-full items-center justify-center rounded-md px-5 py-2.5 text-sm font-medium transition focus-ring sm:w-auto';

export default function HeroAuthCTA() {
  const { isAuthenticated, hydrate } = useAuthStore();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  if (isAuthenticated) {
    return (
      <div className="flex w-full max-w-md flex-col gap-3 pt-2 sm:max-w-none sm:flex-row sm:flex-wrap">
        <Link
          to="/appointments"
          className={`${btnBase} border border-stone-900 bg-stone-900 text-stone-50 hover:bg-stone-800`}
        >
          Open appointments
        </Link>
        <Link
          to="/demo"
          className={`${btnBase} border border-stone-400 bg-[#fffefb] text-stone-800 hover:border-stone-500 hover:bg-white dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100 dark:hover:border-stone-500 dark:hover:bg-stone-800`}
        >
          Book a walkthrough
        </Link>
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-md flex-col gap-3 pt-2 sm:max-w-none sm:flex-row sm:flex-wrap">
      <Link
        to="/register"
        className={`${btnBase} border border-stone-900 bg-stone-900 text-stone-50 hover:bg-stone-800`}
      >
        Create account
      </Link>
      <Link
        to="/login"
        className={`${btnBase} border border-stone-400 bg-[#fffefb] text-stone-800 hover:border-stone-500 hover:bg-white dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100 dark:hover:border-stone-500 dark:hover:bg-stone-800`}
      >
        Sign in
      </Link>
      <Link
        to="/demo"
        className={`${btnBase} border border-stone-500 bg-transparent text-stone-800 hover:bg-stone-900/5 dark:border-stone-500 dark:text-stone-200 dark:hover:bg-stone-100/5`}
      >
        Book a demo
      </Link>
    </div>
  );
}
