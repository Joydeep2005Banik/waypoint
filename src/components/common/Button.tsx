import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function Button({
  children,
  className,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  leftIcon,
  rightIcon,
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-xl transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98]';

  const sizeStyles = {
    sm: 'min-h-[38px] px-3 py-1.5 text-xs gap-1.5',
    md: 'min-h-[48px] px-4 py-2.5 text-sm gap-2',
    lg: 'min-h-[56px] px-6 py-3.5 text-base gap-2.5 font-semibold',
  };

  const variantStyles = {
    primary: 'bg-primary text-slate-950 hover:bg-primary-hover focus:ring-primary font-semibold shadow-sm',
    secondary: 'bg-surface-elevated text-slate-100 hover:bg-slate-700 border border-surface-border focus:ring-slate-400',
    outline: 'border border-surface-border bg-transparent text-slate-200 hover:bg-surface-subtle focus:ring-slate-400',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    ghost: 'bg-transparent text-slate-300 hover:bg-surface-subtle hover:text-white focus:ring-slate-400',
  };

  return (
    <button
      className={twMerge(
        clsx(
          baseStyles,
          sizeStyles[size],
          variantStyles[variant],
          fullWidth && 'w-full',
          className
        )
      )}
      disabled={disabled}
      {...props}
    >
      {leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>}
      <span>{children}</span>
      {rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
    </button>
  );
}
