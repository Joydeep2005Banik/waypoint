'use client';

import React from 'react';
import {
  Compass,
  Footprints,
  Navigation,
  Clock,
  Radio,
  CheckCircle2,
  AlertTriangle,
  Pause,
  Play,
  XCircle,
  RotateCw,
  ArrowRight,
  ShieldAlert,
  Check,
  Award,
  Eye
} from 'lucide-react';
import { NavigationSnapshot } from '@/types/navigation';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';

export interface ActiveNavigationPanelProps {
  snapshot: NavigationSnapshot;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  onManualConfirm: () => void;
  onRecoverLocation: () => void;
  onReset: () => void;
}

export function ActiveNavigationPanel({
  snapshot,
  onPause,
  onResume,
  onCancel,
  onManualConfirm,
  onRecoverLocation,
  onReset,
}: ActiveNavigationPanelProps) {
  const {
    state,
    currentWaypoint,
    nextWaypoint,
    currentWaypointIndex,
    distanceToCurrentWaypointMeters,
    distanceToRouteMeters,
    gpsAccuracyStatus,
    arrivalPendingProgress,
    timeElapsedSeconds,
    totalDistanceWalkedMeters,
    route,
    statusMessage,
    errorMessage,
  } = snapshot;

  const totalWaypoints = route.waypoints.length;
  const isCompleted = state === 'COMPLETED';
  const isPaused = state === 'PAUSED';
  const isOffRoute = state === 'REROUTING';
  const isLocationLost = state === 'LOCATION_UNAVAILABLE';
  const isArrivalPending = state === 'ARRIVAL_PENDING';

  // Format Elapsed Time MM:SS
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainderSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainderSecs.toString().padStart(2, '0')}`;
  };

  // State Badge variant
  const getStateBadge = () => {
    switch (state) {
      case 'NAVIGATING':
        return <Badge variant="success" dot>Navigating</Badge>;
      case 'ARRIVAL_PENDING':
        return <Badge variant="warning" dot>Arrival Pending</Badge>;
      case 'WAYPOINT_REACHED':
        return <Badge variant="success">Waypoint Reached</Badge>;
      case 'PAUSED':
        return <Badge variant="neutral">Mission Paused</Badge>;
      case 'REROUTING':
        return <Badge variant="warning" dot>Off-Route / Rerouting</Badge>;
      case 'LOCATION_UNAVAILABLE':
        return <Badge variant="danger" dot>GPS Lost</Badge>;
      case 'COMPLETED':
        return <Badge variant="success">Completed</Badge>;
      case 'CANCELLED':
        return <Badge variant="danger">Cancelled</Badge>;
      default:
        return <Badge variant="neutral">Ready</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Off-Route Alert Banner */}
      {isOffRoute && (
        <div className="p-3.5 rounded-xl bg-amber-950/90 border border-amber-700 text-amber-200 text-xs flex items-start gap-2.5 shadow-lg">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1">
            <div className="font-bold text-slate-100">Route Deviation Detected</div>
            <div className="leading-relaxed">
              You are currently ~{distanceToRouteMeters}m off the designated pedestrian path. Walk back towards the highlighted path to resume automatic guidance.
            </div>
          </div>
        </div>
      )}

      {/* 2. GPS Loss Alert Banner */}
      {isLocationLost && (
        <div className="p-3.5 rounded-xl bg-red-950/90 border border-red-800 text-red-200 text-xs flex items-start gap-2.5 shadow-lg">
          <Radio className="w-5 h-5 text-red-400 shrink-0 mt-0.5 animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="font-bold text-slate-100">GPS Signal Lost</div>
            <div className="leading-relaxed">{errorMessage || 'Your device location could not be updated.'}</div>
            <div className="flex gap-2 pt-1">
              <Button variant="secondary" size="sm" onClick={onRecoverLocation}>
                Retry GPS Lock
              </Button>
              <Button variant="outline" size="sm" onClick={onManualConfirm}>
                Manual Advance
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Completed State Card */}
      {isCompleted ? (
        <Card variant="elevated" className="text-center py-8 px-4 space-y-5">
          <div className="w-16 h-16 rounded-full bg-primary-dim border-2 border-primary text-primary flex items-center justify-center mx-auto shadow-lg">
            <Award className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-slate-100">Mission Accomplished!</h2>
            <p className="text-xs text-slate-400">
              You have completed all {totalWaypoints} waypoints in this walking mission.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 max-w-sm mx-auto">
            <div className="p-3 rounded-xl bg-surface-subtle border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase font-mono">Distance</div>
              <div className="text-base font-bold font-mono text-primary">
                {(totalDistanceWalkedMeters / 1000).toFixed(2)} km
              </div>
            </div>
            <div className="p-3 rounded-xl bg-surface-subtle border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase font-mono">Duration</div>
              <div className="text-base font-bold font-mono text-accent">
                {formatTime(timeElapsedSeconds)}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-surface-subtle border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase font-mono">Waypoints</div>
              <div className="text-base font-bold font-mono text-amber-400">
                {totalWaypoints} / {totalWaypoints}
              </div>
            </div>
          </div>

          <div className="pt-2">
            <Button variant="primary" size="lg" fullWidth onClick={onReset}>
              Explore New Mission
            </Button>
          </div>
        </Card>
      ) : (
        /* 4. Active Navigation Main Dashboard Card */
        <Card variant="elevated" className="space-y-5">
          {/* Top Status Row */}
          <div className="flex items-center justify-between border-b border-surface-border pb-3">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-primary animate-spin" style={{ animationDuration: '8s' }} />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Waypoint {currentWaypointIndex + 1} of {totalWaypoints}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {getStateBadge()}
              <Badge
                variant={
                  gpsAccuracyStatus === 'GOOD'
                    ? 'success'
                    : gpsAccuracyStatus === 'MODERATE'
                    ? 'warning'
                    : 'danger'
                }
                size="sm"
              >
                <Radio className="w-2.5 h-2.5" />
                <span>
                  {snapshot.lastValidGps ? `±${Math.round(snapshot.lastValidGps.accuracy)}m` : 'No GPS'}
                </span>
              </Badge>
            </div>
          </div>

          {/* Primary Target Waypoint & Distance Hero Display */}
          <div className="p-4 rounded-2xl bg-surface-subtle border border-slate-800/80 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <span className="text-[11px] font-mono uppercase tracking-wider text-primary font-bold">
                  Current Destination ({currentWaypoint.category})
                </span>
                <h2 className="text-lg font-extrabold text-slate-100 leading-tight">
                  {currentWaypoint.name}
                </h2>
              </div>
              <div className="text-right shrink-0">
                <div className="text-2xl font-black font-mono text-primary">
                  {distanceToCurrentWaypointMeters > 1000
                    ? `${(distanceToCurrentWaypointMeters / 1000).toFixed(2)} km`
                    : `${distanceToCurrentWaypointMeters} m`}
                </div>
                <div className="text-[10px] text-slate-400 font-mono">Distance to target</div>
              </div>
            </div>

            {/* Glanceable Walking Instruction */}
            <div className="p-3 rounded-xl bg-surface border border-slate-700/80 text-xs text-slate-200 leading-relaxed font-medium">
              {currentWaypoint.instruction}
            </div>

            {/* Glanceable Observation Prompt */}
            {currentWaypoint.observationPrompt && (
              <div className="text-[11px] text-amber-300/90 flex items-start gap-1.5 bg-amber-950/40 border border-amber-800/50 rounded-xl p-2.5">
                <Eye className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                <div className="leading-snug">
                  <span className="font-semibold text-amber-200">Look up: </span>
                  {currentWaypoint.observationPrompt}
                </div>
              </div>
            )}

            {/* Arrival Confirmation Dwell Progress Bar */}
            {isArrivalPending && (
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-[11px] text-amber-300 font-semibold">
                  <span>Proximity Reached — Confirming Arrival...</span>
                  <span>{Math.round(arrivalPendingProgress * 100)}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-amber-400 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.max(5, arrivalPendingProgress * 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Next Waypoint Glance Row */}
          {nextWaypoint && (
            <div className="px-3.5 py-2.5 rounded-xl bg-surface-subtle/60 border border-slate-800/60 flex items-center justify-between text-xs text-slate-300">
              <div className="flex items-center gap-2 truncate">
                <span className="text-[10px] uppercase font-mono text-slate-400 shrink-0">Next Up:</span>
                <span className="font-medium text-slate-200 truncate">{nextWaypoint.name}</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </div>
          )}

          {/* Metrics Summary Strip (Elapsed Time & Distance) */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-2.5 rounded-xl bg-surface-subtle border border-slate-800 flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-accent shrink-0" />
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-mono">Elapsed</div>
                <div className="text-xs font-bold font-mono text-slate-100">
                  {formatTime(timeElapsedSeconds)}
                </div>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-surface-subtle border border-slate-800 flex items-center gap-2.5">
              <Footprints className="w-4 h-4 text-primary shrink-0" />
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-mono">Walked</div>
                <div className="text-xs font-bold font-mono text-slate-100">
                  {(totalDistanceWalkedMeters / 1000).toFixed(2)} km
                </div>
              </div>
            </div>
          </div>

          {/* Action Controls */}
          <div className="space-y-2.5 pt-1">
            {/* Primary Arrival Override */}
            <Button
              variant="primary"
              size="lg"
              fullWidth
              leftIcon={<Check className="w-5 h-5 stroke-[2.5]" />}
              onClick={onManualConfirm}
            >
              Confirm Waypoint Arrival
            </Button>

            {/* Pause / Resume / Cancel Controls */}
            <div className="flex gap-2">
              {isPaused ? (
                <Button
                  variant="secondary"
                  size="md"
                  fullWidth
                  leftIcon={<Play className="w-4 h-4 text-primary fill-current" />}
                  onClick={onResume}
                >
                  Resume Mission
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  size="md"
                  fullWidth
                  leftIcon={<Pause className="w-4 h-4 text-amber-400" />}
                  onClick={onPause}
                >
                  Pause
                </Button>
              )}

              <Button
                variant="outline"
                size="md"
                leftIcon={<XCircle className="w-4 h-4 text-red-400" />}
                onClick={onCancel}
                className="w-1/3 text-red-300 border-red-900/50 hover:bg-red-950/40"
              >
                End
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Eyes-Up Reminder footer */}
      <div className="text-center text-[11px] text-slate-500 flex items-center justify-center gap-1.5 py-1">
        <ShieldAlert className="w-3.5 h-3.5 text-warning" />
        <span>Keep your head up while walking. The app will alert you on arrival.</span>
      </div>
    </div>
  );
}
