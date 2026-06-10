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
          className="inline-flex items-center justify-center rounded-md border border-stone-900 bg-stone-900 px-5 py-2.5 text-sm font-semibold text-stone-50 transition hover:bg-stone-800 focus-ring"
        >
          Open appointments
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3 pt-2">
      <Link
        to="/register"
        className="inline-flex items-center justify-center rounded-md border border-stone-900 bg-stone-900 px-5 py-2.5 text-sm font-semibold text-stone-50 transition hover:bg-stone-800 focus-ring"
      >
        Create account
      </Link>
      <Link
        to="/login"
        className="inline-flex items-center justify-center rounded-md border border-stone-300 bg-white px-5 py-2.5 text-sm font-semibold text-stone-800 transition hover:border-stone-400 hover:bg-stone-50 focus-ring"
      >
        Sign in
      </Link>
    </div>
  );
}
