'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MapPin, Navigation, Sliders, FolderDown } from 'lucide-react';
import { clsx } from 'clsx';

export function AppBottomNav() {
  const pathname = usePathname();

  const navItems = [
    {
      label: 'Explore',
      href: '/',
      icon: MapPin,
      active: pathname === '/',
    },
    {
      label: 'Missions',
      href: '/missions',
      icon: FolderDown,
      active: pathname === '/missions',
    },
    {
      label: 'Settings',
      href: '/settings',
      icon: Sliders,
      active: pathname === '/settings',
    },
  ];

  return (
    <nav
      aria-label="Main Navigation"
      className="fixed bottom-0 left-0 right-0 z-30 bg-surface/95 backdrop-blur-lg border-t border-surface-border pb-safe"
    >
      <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'flex flex-col items-center justify-center flex-1 h-full py-1 rounded-xl transition-all select-none',
                'focus:outline-none focus:ring-2 focus:ring-primary',
                item.active
                  ? 'text-primary font-semibold'
                  : 'text-slate-400 hover:text-slate-200 active:text-slate-100'
              )}
            >
              <div
                className={clsx(
                  'p-1 rounded-lg transition-transform',
                  item.active && 'bg-primary-dim/60 scale-105'
                )}
              >
                <Icon className={clsx('w-5 h-5', item.active ? 'text-primary' : 'text-slate-400')} />
              </div>
              <span className="text-[11px] mt-0.5 tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
