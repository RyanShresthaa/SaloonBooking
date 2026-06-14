import React, { useId, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  /** Salon desk auth — warm border, inset depth, refined focus */
  variant?: 'default' | 'desk';
  /** When `type="password"`, adds a control to show or hide the value (login / register). */
  passwordToggle?: boolean;
}

export default function Input({
  label,
  error,
  className = '',
  id,
  variant = 'default',
  type = 'text',
  passwordToggle = false,
  ...props
}: InputProps) {
  const reactId = useId();
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-') || `input-${reactId}`;
  const [showPassword, setShowPassword] = useState(false);
  const isPasswordField = type === 'password';
  const showToggle = passwordToggle && isPasswordField;
  const resolvedType = showToggle ? (showPassword ? 'text' : 'password') : type;

  const deskTone =
    variant === 'desk'
      ? `rounded-[6px] border-[#e0d9d0] bg-white ${showToggle ? 'pr-10' : 'px-3.5'} py-2.5 pl-3.5 text-sm text-[#1c1917] shadow-[inset_0_1px_2px_rgba(28,25,23,0.05)] placeholder:text-[#78716c] transition-[border-color,box-shadow] duration-200 hover:border-[#cfc4b8] focus:border-[#2d2926] focus:outline-none focus:ring-2 focus:ring-[#b07d62]/25 focus:ring-offset-0 dark:border-stone-600 dark:bg-stone-950 dark:text-stone-100 dark:placeholder:text-stone-500`
      : `rounded-[var(--radius-input)] border bg-white py-2.5 text-sm text-stone-900 placeholder:text-stone-500 transition-colors focus-ring dark:bg-stone-950 dark:text-stone-100 dark:placeholder:text-stone-500 ${showToggle ? 'pl-3 pr-10' : 'px-3'}`;
  const defaultToneBorder = error
    ? 'border-red-400/90 focus-visible:ring-red-200'
    : 'border-stone-300 hover:border-stone-400/90';

  const toggleBtnClass =
    variant === 'desk'
      ? 'absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1.5 text-[#78716c] transition-colors hover:bg-[#f5f0ea] hover:text-[#1c1917] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b07d62]/35 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100'
      : 'absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1.5 text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400/40 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100';

  const inputClassName = `w-full ${deskTone} ${variant === 'default' ? defaultToneBorder : ''} ${
    variant === 'desk' && error ? 'border-red-400/90 focus:border-red-500 focus:ring-red-200/40' : ''
  } ${className}`;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className={`text-[13px] font-medium ${variant === 'desk' ? 'text-[#57534e]' : 'text-stone-700 dark:text-stone-300'}`}
        >
          {label}
        </label>
      )}
      {showToggle ? (
        <div className="relative">
          <input id={inputId} type={resolvedType} className={inputClassName} {...props} />
          <button
            type="button"
            className={toggleBtnClass}
            aria-pressed={showPassword}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            onClick={() => setShowPassword((v) => !v)}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            ) : (
              <Eye className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            )}
          </button>
        </div>
      ) : (
        <input id={inputId} type={resolvedType} className={inputClassName} {...props} />
      )}
      {error && <p className="text-xs font-medium text-red-700">{error}</p>}
    </div>
  );
}
