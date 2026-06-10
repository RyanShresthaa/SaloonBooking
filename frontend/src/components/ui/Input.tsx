import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export default function Input({ label, error, className = '', id, ...props }: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`rounded-md border bg-white px-3 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 transition-colors focus-ring ${
          error ? 'border-red-400/90 focus-visible:ring-red-200' : 'border-stone-300 hover:border-stone-400/90'
        } ${className}`}
        {...props}
      />
      {error && <p className="text-xs font-medium text-red-700">{error}</p>}
    </div>
  );
}
