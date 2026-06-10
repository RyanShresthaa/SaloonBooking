import React from 'react';

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
  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-md font-sans transition-[color,background-color,border-color,box-shadow] duration-150 focus-ring disabled:pointer-events-none disabled:opacity-45 ${variants[variant]} ${sizes[size]} ${className}`}
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
