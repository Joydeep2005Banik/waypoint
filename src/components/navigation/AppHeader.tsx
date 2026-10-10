import React from 'react';
import Link from 'next/link';
import { Compass, Shield, Radio } from 'lucide-react';
import { Badge } from '@/components/common/Badge';

export function AppHeader() {
  return (
    <header className="sticky top-0 z-30 w-full bg-surface/90 backdrop-blur-md border-b border-surface-border">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        {/* Brand */}
        <Link
          href="/"
          className="flex items-center gap-2.5 group focus:outline-none focus:ring-2 focus:ring-primary rounded-lg p-1 -ml-1"
        >
          <div className="w-9 h-9 rounded-xl bg-primary-dim border border-primary/40 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-slate-950 transition-colors">
            <Compass className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-sm tracking-wider uppercase text-slate-100 flex items-center gap-1.5">
              Waypoint
              <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-surface-elevated border border-slate-700 text-primary">
                AUTOPILOT
              </span>
            </span>
            <span className="text-[11px] text-slate-400 font-medium">Urban & Park Walking</span>
          </div>
        </Link>

        {/* Status Indicators */}
        <div className="flex items-center gap-2">
          {/* Privacy & Local Storage Badge */}
          <div className="hidden sm:flex items-center">
            <Badge variant="neutral" size="sm">
              <Shield className="w-3 h-3 text-slate-400" />
              <span>Local Storage</span>
            </Badge>
          </div>

          {/* GPS Readiness Indicator */}
          <Badge variant="success" size="sm" dot>
            <Radio className="w-3 h-3" />
            <span>GPS Standby</span>
          </Badge>
        </div>
      </div>
    </header>
  );
}
