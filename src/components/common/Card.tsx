import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'subtle' | 'accent' | 'warning';
}

export function Card({
  children,
  className,
  variant = 'default',
  ...props
}: CardProps) {
  const variantStyles = {
    default: 'bg-surface border border-surface-border text-slate-100',
    elevated: 'bg-surface-elevated border border-slate-700 shadow-md text-slate-100',
    subtle: 'bg-surface-subtle border border-slate-800 text-slate-200',
    accent: 'bg-surface border border-accent/40 shadow-sm text-slate-100',
    warning: 'bg-surface border border-warning/40 shadow-sm text-slate-100',
  };

  return (
    <div
      className={twMerge(
        clsx(
          'rounded-2xl p-4 sm:p-5 transition-all',
          variantStyles[variant],
          className
        )
      )}
      {...props}
    >
      {children}
    </div>
  );
}
