'use client';

import React from 'react';
import { FolderDown, HardDrive, ShieldCheck, MapPinOff } from 'lucide-react';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';

export default function MissionsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <FolderDown className="w-5 h-5 text-primary" />
            <span>Saved Missions</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Offline-cached routes and historical exploration records
          </p>
        </div>
        <Badge variant="neutral" size="sm">
          <HardDrive className="w-3 h-3 text-slate-400" />
          <span>IndexedDB</span>
        </Badge>
      </div>

      {/* Empty State Card */}
      <Card variant="default" className="py-12 px-6 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-surface-elevated border border-slate-800 flex items-center justify-center text-slate-400 mx-auto">
          <MapPinOff className="w-6 h-6" />
        </div>
        <div className="space-y-1 max-w-sm mx-auto">
          <h2 className="text-sm font-semibold text-slate-200">No Saved Missions Found</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Missions you generate and download before departure will be stored locally in IndexedDB for complete offline exploration.
          </p>
        </div>
        <div className="pt-2">
          <Button variant="secondary" size="md" onClick={() => window.location.href = '/'}>
            Create New Mission
          </Button>
        </div>
      </Card>

      {/* Storage Architecture Overview */}
      <Card variant="subtle" className="space-y-3">
        <div className="flex items-center gap-2 text-slate-300">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <h2 className="text-xs font-bold uppercase tracking-wider">Local Persistence Guarantee</h2>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          All mission polylines, waypoint coordinates, and cached map vector data are stored directly inside your browser’s IndexedDB sandbox. No external servers or cloud accounts receive your movement history.
        </p>
      </Card>
    </div>
  );
}
