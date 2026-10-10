import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { AlertCircle, AlertTriangle, CheckCircle, Info, X } from 'lucide-react';

export interface StatusBannerProps {
  type?: 'info' | 'warning' | 'error' | 'success';
  title?: string;
  message: string;
  onDismiss?: () => void;
  className?: string;
}

export function StatusBanner({
  type = 'info',
  title,
  message,
  onDismiss,
  className,
}: StatusBannerProps) {
  const config = {
    info: {
      container: 'bg-sky-950/90 border-sky-800 text-sky-200',
      icon: <Info className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />,
    },
    warning: {
      container: 'bg-amber-950/90 border-amber-700 text-amber-200',
      icon: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />,
    },
    error: {
      container: 'bg-red-950/90 border-red-800 text-red-200',
      icon: <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />,
    },
    success: {
      container: 'bg-emerald-950/90 border-emerald-800 text-emerald-200',
      icon: <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />,
    },
  };

  const current = config[type];

  return (
    <div
      role="alert"
      className={twMerge(
        clsx(
          'flex items-start gap-3 p-3.5 sm:p-4 rounded-xl border text-sm',
          current.container,
          className
        )
      )}
    >
      {current.icon}
      <div className="flex-1 min-w-0">
        {title && <div className="font-semibold text-slate-100 mb-0.5">{title}</div>}
        <div className="leading-relaxed opacity-90">{message}</div>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="shrink-0 p-1 -mr-1 -mt-1 rounded-lg hover:bg-white/10 transition-colors text-slate-400 hover:text-slate-100"
          aria-label="Dismiss banner"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
