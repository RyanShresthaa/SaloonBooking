import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

export default function AuthGuard({ children }: { children: ReactNode }) {
  const { isAuthenticated, hydrate } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!isAuthenticated) {
      const token = localStorage.getItem('token');
      if (!token) navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-stone-800" />
      </div>
    );
  }

  return <>{children}</>;
}
