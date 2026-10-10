'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { MapPin, Loader2 } from 'lucide-react';
import type { LeafletMapProps } from './LeafletMap';

const DynamicLeafletMap = dynamic(() => import('./LeafletMap'), {
  ssr: false,
  loading: () => (
    <div className="h-[360px] w-full rounded-2xl bg-surface-subtle border border-surface-border flex flex-col items-center justify-center text-slate-400 gap-3">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
      <span className="text-xs font-medium tracking-wide">Loading Interactive Map...</span>
    </div>
  ),
});

export function MapContainer(props: LeafletMapProps) {
  return <DynamicLeafletMap {...props} />;
}
