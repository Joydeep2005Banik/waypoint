'use client';

import React from 'react';
import {
  Footprints,
  Clock,
  Sparkles,
  RotateCcw,
  Play,
  Eye,
  Cpu
} from 'lucide-react';
import { PreparedRoute } from '@/types/geo';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';

export interface RoutePreviewCardProps {
  route: PreparedRoute;
  onReset: () => void;
  onStartNavigation?: () => void;
}

export function RoutePreviewCard({
  route,
  onReset,
  onStartNavigation,
}: RoutePreviewCardProps) {
  const distanceKm = (route.totalDistanceMeters / 1000).toFixed(2);
  const distanceMiles = (route.totalDistanceMeters / 1609.34).toFixed(2);

  return (
    <Card variant="elevated" className="space-y-5">
      {/* Route Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-surface-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-100">{route.title}</h2>
            <Badge variant="info" size="sm">Score {route.candidateScore}</Badge>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Starting from <span className="text-slate-200 font-medium">{route.startLocation.name}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={route.isLoop ? 'success' : 'neutral'} size="sm">
            {route.isLoop ? 'Loop Circuit' : 'One-Way Trail'}
          </Badge>
          <Badge variant="neutral" size="sm">
            {route.waypoints.length} Waypoints
          </Badge>
        </div>
      </div>

      {/* AI Theme & Mission Brief Box */}
      {route.thematicSummary && (
        <div className="p-3.5 rounded-xl bg-surface-subtle border border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-bold uppercase tracking-wider text-accent flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Theme: {route.theme || route.explorationStyle}</span>
            </div>
            {route.aiEnrichment && (
              <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                <Cpu className="w-3 h-3 text-primary" />
                {route.aiEnrichment.provider === 'ollama' ? 'Ollama Open-Weight' : 'Deterministic Brief'}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            {route.thematicSummary}
          </p>
        </div>
      )}

      {/* Metrics Row (Distance, Time, Legs) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="p-3 rounded-xl bg-surface-subtle border border-slate-800 space-y-0.5">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Footprints className="w-3.5 h-3.5 text-primary" />
            <span>Walking Distance</span>
          </div>
          <div className="text-lg font-mono font-bold text-slate-100">
            {distanceKm} <span className="text-xs font-normal text-slate-400">km</span>
            <span className="text-xs font-normal text-slate-500 ml-1.5">({distanceMiles} mi)</span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-surface-subtle border border-slate-800 space-y-0.5">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-accent" />
            <span>Est. Duration</span>
          </div>
          <div className="text-lg font-mono font-bold text-slate-100">
            ~{route.totalDurationMinutes} <span className="text-xs font-normal text-slate-400">mins</span>
          </div>
        </div>

        <div className="col-span-2 sm:col-span-1 p-3 rounded-xl bg-surface-subtle border border-slate-800 space-y-0.5">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Style Target</span>
          </div>
          <div className="text-sm font-semibold text-slate-200 capitalize">
            {route.explorationStyle}
          </div>
        </div>
      </div>

      {/* Ordered Waypoint List with Observation Prompts */}
      <div className="space-y-2.5">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
          <span>Ordered Waypoint Sequence</span>
          <span className="text-[10px] text-slate-500">Auto-Progression Enabled</span>
        </div>

        <div className="space-y-2">
          {route.waypoints.map((wp) => (
            <div
              key={wp.id}
              className="p-3 rounded-xl bg-surface-subtle border border-slate-800/80 flex items-start gap-3 hover:border-slate-700 transition-colors"
            >
              <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-mono font-bold text-primary shrink-0 mt-0.5">
                {wp.isStart ? 'S' : wp.isEnd ? 'E' : wp.order}
              </div>

              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-bold text-slate-100 truncate">{wp.name}</div>
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-surface border border-slate-700 text-slate-400 shrink-0">
                    {wp.category}
                  </span>
                </div>
                <div className="text-[11px] text-slate-300 leading-snug">
                  {wp.instruction}
                </div>
                {wp.observationPrompt && (
                  <div className="text-[11px] text-amber-300/90 flex items-start gap-1 bg-amber-950/30 border border-amber-800/40 rounded-lg p-1.5">
                    <Eye className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
                    <span>{wp.observationPrompt}</span>
                  </div>
                )}
                <div className="text-[10px] text-slate-500 font-mono">
                  Coordinates: {wp.coordinates.latitude.toFixed(5)}, {wp.coordinates.longitude.toFixed(5)} · Radius: ±{wp.arrivalRadiusMeters}m
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Triggers */}
      <div className="pt-2 flex flex-col sm:flex-row gap-3">
        <Button
          variant="outline"
          size="lg"
          leftIcon={<RotateCcw className="w-4 h-4" />}
          onClick={onReset}
          className="sm:w-1/3"
        >
          Reconfigure
        </Button>

        <Button
          variant="primary"
          size="lg"
          fullWidth
          leftIcon={<Play className="w-5 h-5 fill-current" />}
          onClick={onStartNavigation || (() => alert('Beginning mission.'))}
        >
          Begin Walking Mission
        </Button>
      </div>
    </Card>
  );
}
