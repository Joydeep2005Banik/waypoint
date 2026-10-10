import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'warning' | 'info' | 'neutral' | 'danger';
  size?: 'sm' | 'md';
  dot?: boolean;
}

export function Badge({
  children,
  className,
  variant = 'neutral',
  size = 'md',
  dot = false,
  ...props
}: BadgeProps) {
  const variantStyles = {
    success: 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80',
    warning: 'bg-amber-950/80 text-amber-300 border-amber-800/80',
    info: 'bg-sky-950/80 text-sky-300 border-sky-800/80',
    neutral: 'bg-slate-800/80 text-slate-300 border-slate-700/80',
    danger: 'bg-red-950/80 text-red-300 border-red-800/80',
  };

  const dotColors = {
    success: 'bg-emerald-400',
    warning: 'bg-amber-400',
    info: 'bg-sky-400',
    neutral: 'bg-slate-400',
    danger: 'bg-red-400',
  };

  const sizeStyles = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
  };

  return (
    <span
      className={twMerge(
        clsx(
          'inline-flex items-center gap-1.5 font-medium rounded-full border',
          sizeStyles[size],
          variantStyles[variant],
          className
        )
      )}
      {...props}
    >
      {dot && <span className={clsx('w-1.5 h-1.5 rounded-full animate-pulse', dotColors[variant])} />}
      {children}
    </span>
  );
}
