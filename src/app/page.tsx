'use client';

import React, { useState } from 'react';
import {
  Compass,
  MapPin,
  Clock,
  TreePine,
  Landmark,
  Footprints,
  SlidersHorizontal,
  ShieldAlert,
  Info,
  Sparkles,
  Play
} from 'lucide-react';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { StatusBanner } from '@/components/common/StatusBanner';

export default function HomePage() {
  const [explorationStyle, setExplorationStyle] = useState<string>('greenway');
  const [durationMinutes, setDurationMinutes] = useState<number>(35);
  const [radiusKm, setRadiusKm] = useState<number>(1.2);

  const explorationStyles = [
    {
      id: 'greenway',
      title: 'Greenway & Nature',
      description: 'Public parks, tree-canopied paths, and garden trails',
      icon: TreePine,
    },
    {
      id: 'heritage',
      title: 'Architectural & Heritage',
      description: 'Historical landmarks, civic plazas, and architectural monuments',
      icon: Landmark,
    },
    {
      id: 'discovery',
      title: 'Urban Discovery',
      description: 'Quiet pedestrian alleys, community squares, and street art',
      icon: Footprints,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Notification / Eyes-Up Reminder */}
      <StatusBanner
        type="info"
        title="Eyes Up, Phone Away"
        message="Waypoint Autopilot alerts you with chimes and vibration on arrival. Put your phone in your pocket while walking and stay aware of your surroundings."
      />

      {/* Main Mission Setup Card */}
      <Card variant="elevated" className="space-y-6">
        <div className="flex items-center justify-between border-b border-surface-border pb-4">
          <div>
            <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <Compass className="w-5 h-5 text-primary" />
              <span>Mission Setup</span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Configure parameters for your autonomous pedestrian walk
            </p>
          </div>
          <Badge variant="info" size="sm">Phase 1 Foundation</Badge>
        </div>

        {/* Starting Point Anchor */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-primary" />
            <span>Starting Location</span>
          </label>
          <div className="p-3.5 rounded-xl bg-surface-subtle border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-primary animate-ping" />
              <div>
                <div className="text-sm font-medium text-slate-200">Current Device GPS</div>
                <div className="text-xs text-slate-400 font-mono">Foreground Geolocation Hook (Ready)</div>
              </div>
            </div>
            <Badge variant="neutral" size="sm">Auto-Detect</Badge>
          </div>
        </div>

        {/* Exploration Style Picker */}
        <div className="space-y-2.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-accent" />
            <span>Exploration Style</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {explorationStyles.map((style) => {
              const Icon = style.icon;
              const isSelected = explorationStyle === style.id;
              return (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => setExplorationStyle(style.id)}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'bg-primary-dim/30 border-primary text-slate-100 shadow-sm'
                      : 'bg-surface-subtle border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-primary' : 'text-slate-400'}`} />
                    <span className="text-xs font-semibold">{style.title}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug">{style.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Duration and Radius Sliders */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {/* Target Duration */}
          <div className="p-3.5 rounded-xl bg-surface-subtle border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-primary" />
                <span>Target Duration</span>
              </label>
              <span className="text-xs font-mono font-bold text-primary">{durationMinutes} mins</span>
            </div>
            <input
              type="range"
              min="15"
              max="90"
              step="5"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
              className="w-full accent-primary bg-slate-700 h-2 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>15m Quick</span>
              <span>45m Standard</span>
              <span>90m Long</span>
            </div>
          </div>

          {/* Maximum Radius */}
          <div className="p-3.5 rounded-xl bg-surface-subtle border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-accent" />
                <span>Max Exploration Radius</span>
              </label>
              <span className="text-xs font-mono font-bold text-accent">{radiusKm} km</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="3.0"
              step="0.1"
              value={radiusKm}
              onChange={(e) => setRadiusKm(Number(e.target.value))}
              className="w-full accent-accent bg-slate-700 h-2 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>0.5 km (Close)</span>
              <span>1.5 km (Moderate)</span>
              <span>3.0 km (Wide)</span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            leftIcon={<Play className="w-5 h-5 fill-current" />}
            onClick={() => alert('Phase 1 Foundation: Route generation and map engine unlock in Phase 2 & 3.')}
          >
            Generate Waypoint Route
          </Button>
          <p className="text-center text-[11px] text-slate-500 mt-2">
            Deterministic route synthesis with OpenStreetMap pedestrian topology
          </p>
        </div>
      </Card>

      {/* Safety and Privacy Guardrails Card */}
      <Card variant="subtle" className="space-y-3">
        <div className="flex items-center gap-2 text-slate-200">
          <ShieldAlert className="w-4 h-4 text-warning" />
          <h2 className="text-xs font-bold uppercase tracking-wider">Safety & Privacy Assurances</h2>
        </div>
        <ul className="text-xs text-slate-400 space-y-1.5 list-disc pl-4 leading-relaxed">
          <li><strong>Zero Remote Tracking:</strong> Location coordinates and mission logs remain entirely on your device in IndexedDB.</li>
          <li><strong>Pedestrian Rights-of-Way:</strong> Routes exclude private property, motorways, and industrial corridors.</li>
          <li><strong>Road Crossing Priority:</strong> Never look at your device while traversing street intersections or uneven terrain.</li>
        </ul>
      </Card>
    </div>
  );
}
