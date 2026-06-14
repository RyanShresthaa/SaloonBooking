import React from 'react';
import { useAuthStore } from '@/store/authStore';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

const variants = {
  primary:
    'bg-stone-900 text-stone-50 shadow-sm hover:bg-stone-800 active:bg-stone-950 border border-stone-900/80',
  secondary:
    'bg-white text-stone-800 border border-stone-300 hover:border-stone-400 hover:bg-stone-50 active:bg-stone-100',
  danger: 'bg-red-800 text-white border border-red-900/30 hover:bg-red-700 active:bg-red-900',
  ghost: 'bg-transparent text-stone-700 hover:bg-stone-200/50 border border-transparent',
};

const customerPrimary =
  'bg-stone-900 text-stone-50 border border-stone-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)] hover:bg-stone-800 hover:border-stone-900 active:bg-stone-950 dark:bg-stone-100 dark:text-stone-900 dark:border-stone-300 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] dark:hover:bg-white dark:hover:border-stone-200';

const sizes = {
  sm: 'px-3.5 py-2 text-xs font-semibold tracking-wide',
  md: 'px-4 py-2.5 text-sm font-semibold',
  lg: 'px-6 py-3 text-[0.9375rem] font-semibold',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  className = '',
  ...props
}: ButtonProps) {
  const role = useAuthStore((s) => s.user?.role);
  const salonDesk = role === 'admin' || role === 'staff';
  const primaryClass =
    variant === 'primary' ? (salonDesk ? variants.primary : customerPrimary) : variants[variant];

  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-md font-sans transition-[color,background-color,border-color,box-shadow,transform] duration-200 focus-ring disabled:pointer-events-none disabled:opacity-45 ${primaryClass} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4 opacity-80" fill="none" viewBox="0 0 24 24" aria-hidden>
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      )}
      {children}
    </button>
  );
}
