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
  Sparkles,
  Play,
  RotateCw,
  Loader2,
  AlertCircle,
  Repeat,
  Navigation
} from 'lucide-react';
import { GeoCoordinates, ExplorationStyle, PreparedRoute } from '@/types/geo';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { StatusBanner } from '@/components/common/StatusBanner';
import { MapContainer } from '@/components/map/MapContainer';
import { LocationSelector } from '@/components/route/LocationSelector';
import { RoutePreviewCard } from '@/components/route/RoutePreviewCard';
import { ActiveNavigationPanel } from '@/components/navigation/ActiveNavigationPanel';
import { useNavigationAutopilot } from '@/hooks/useNavigationAutopilot';
import { OverpassPoiService } from '@/services/poi';
import { OsrmRoutingService } from '@/services/routing';
import { NominatimGeocodingService } from '@/services/geocoding';
import { RouteGenerator } from '@/services/route-generator';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

export default function HomePage() {
  const isOnline = useOnlineStatus();

  // Setup inputs state
  const [selectedLocation, setSelectedLocation] = useState<GeoCoordinates | null>(null);
  const [locationName, setLocationName] = useState<string>('');
  const [explorationStyle, setExplorationStyle] = useState<ExplorationStyle>('greenway');
  const [durationMinutes, setDurationMinutes] = useState<number>(35);
  const [radiusKm, setRadiusKm] = useState<number>(1.2);
  const [preferLoop, setPreferLoop] = useState<boolean>(true);

  // Generation & navigation state
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [preparedRoute, setPreparedRoute] = useState<PreparedRoute | null>(null);
  const [isNavigating, setIsNavigating] = useState<boolean>(false);

  // Autopilot navigation hook
  const autopilot = useNavigationAutopilot(isNavigating ? preparedRoute : null);

  const explorationStyles: {
    id: ExplorationStyle;
    title: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
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
      description: 'Pedestrian alleys, community squares, and street art',
      icon: Footprints,
    },
    {
      id: 'quiet',
      title: 'Quiet Paths',
      description: 'Low-traffic footways and residential living streets',
      icon: Footprints,
    },
  ];

  const handleLocationChange = (coords: GeoCoordinates, name: string) => {
    setSelectedLocation(coords);
    setLocationName(name);
    setPreparedRoute(null);
    setGenerationError(null);
  };

  const handleGenerateRoute = async () => {
    if (!selectedLocation) {
      setGenerationError('Please select a starting location before generating a route.');
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);

    try {
      const poiService = new OverpassPoiService();
      const routingService = new OsrmRoutingService();
      const geocodingService = new NominatimGeocodingService();
      const generator = new RouteGenerator(poiService, routingService, undefined, geocodingService);

      const route = await generator.generateRoute({
        start: selectedLocation,
        startName: locationName || undefined,
        style: explorationStyle,
        targetDurationMinutes: durationMinutes,
        maxRadiusKm: radiusKm,
        preferLoop,
      });

      setPreparedRoute(route);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Failed to generate route. Please check your network or adjust exploration parameters.';
      setGenerationError(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStartMission = () => {
    setIsNavigating(true);
    // State machine automatically starts via hook on active state
    setTimeout(() => {
      autopilot.start();
    }, 50);
  };

  const handleReset = () => {
    autopilot.resetMission();
    setIsNavigating(false);
    setPreparedRoute(null);
    setGenerationError(null);
  };

  // Determine active route & snapshot for map display
  const activeRoute = autopilot.snapshot?.route || preparedRoute;
  const isCurrentlyNavigating = isNavigating && autopilot.snapshot !== null;

  return (
    <div className="space-y-6">
      {/* Eyes-Up Safety Banner */}
      {!isCurrentlyNavigating && (
        <StatusBanner
          type="info"
          title="Eyes Up, Phone Away"
          message="Waypoint Autopilot provides glanceable waypoint navigation and chimes upon arrival. Keep your head up and put your phone in your pocket while walking."
        />
      )}

      {/* Interactive Map Overview */}
      <Card variant="default" className="p-2 sm:p-3 overflow-hidden space-y-2">
        <div className="flex items-center justify-between px-2 pt-1 pb-2 border-b border-surface-border">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
              {isCurrentlyNavigating
                ? 'Active Navigation Map'
                : activeRoute
                ? 'Route Geometry Preview'
                : 'Interactive Map View'}
            </span>
          </div>
          {isCurrentlyNavigating ? (
            <Badge variant="success" size="sm" dot>
              Autopilot Active
            </Badge>
          ) : activeRoute ? (
            <Badge variant="success" size="sm">
              {activeRoute.waypoints.length} Points Connected
            </Badge>
          ) : selectedLocation ? (
            <Badge variant="info" size="sm">Anchor Ready</Badge>
          ) : (
            <Badge variant="neutral" size="sm">No Anchor</Badge>
          )}
        </div>

        <MapContainer
          center={
            autopilot.snapshot?.lastValidGps ||
            selectedLocation || { latitude: 51.505, longitude: -0.09 }
          }
          zoom={15}
          waypoints={activeRoute?.waypoints || []}
          legs={activeRoute?.legs || []}
          boundingBox={activeRoute?.boundingBox}
          selectedLocation={autopilot.snapshot?.lastValidGps || selectedLocation}
          onLocationSelect={
            !activeRoute && !isCurrentlyNavigating
              ? (coords) =>
                  handleLocationChange(
                    coords,
                    `Selected Map Point (${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)})`
                  )
              : undefined
          }
          className="h-[300px] sm:h-[360px] w-full rounded-xl overflow-hidden"
        />

        <div className="text-[11px] text-slate-400 px-2 flex justify-between items-center">
          <span>Map data © OpenStreetMap contributors · OSRM Foot Profile</span>
          {!activeRoute && !isCurrentlyNavigating && (
            <span className="hidden sm:inline text-slate-500 font-mono">Click map to drop anchor pin</span>
          )}
        </div>
      </Card>

      {/* Active Navigation Panel OR Route Preview OR Mission Setup Form */}
      {isCurrentlyNavigating && autopilot.snapshot ? (
        <ActiveNavigationPanel
          snapshot={autopilot.snapshot}
          onPause={autopilot.pause}
          onResume={autopilot.resume}
          onCancel={autopilot.cancel}
          onManualConfirm={autopilot.manualConfirmArrival}
          onRecoverLocation={autopilot.recoverLocation}
          onReset={handleReset}
        />
      ) : preparedRoute ? (
        <RoutePreviewCard
          route={preparedRoute}
          onReset={handleReset}
          onStartNavigation={handleStartMission}
        />
      ) : (
        <Card variant="elevated" className="space-y-6">
          <div className="flex items-center justify-between border-b border-surface-border pb-4">
            <div>
              <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <Compass className="w-5 h-5 text-primary" />
                <span>Mission & Route Setup</span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Set geographic parameters for autonomous pedestrian exploration
              </p>
            </div>
            <Badge variant="info" size="sm">Phase 3 Autopilot</Badge>
          </div>

          {/* Starting Point / Location Selector */}
          <LocationSelector
            selectedLocation={selectedLocation}
            locationName={locationName}
            onLocationChange={handleLocationChange}
            disabled={isGenerating}
          />

          {/* Exploration Style Picker */}
          <div className="space-y-2.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-accent" />
              <span>Exploration Style</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {explorationStyles.map((style) => {
                const Icon = style.icon;
                const isSelected = explorationStyle === style.id;
                return (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() => setExplorationStyle(style.id)}
                    disabled={isGenerating}
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

          {/* Duration, Radius, and Loop Controls */}
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
                disabled={isGenerating}
                className="w-full accent-primary bg-slate-700 h-2 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>15m Short</span>
                <span>45m Moderate</span>
                <span>90m Long</span>
              </div>
            </div>

            {/* Maximum Radius */}
            <div className="p-3.5 rounded-xl bg-surface-subtle border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-accent" />
                  <span>Max Radius</span>
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
                disabled={isGenerating}
                className="w-full accent-accent bg-slate-700 h-2 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>0.5 km (Close)</span>
                <span>1.5 km (Standard)</span>
                <span>3.0 km (Wide)</span>
              </div>
            </div>
          </div>

          {/* Loop Preference Toggle */}
          <div className="p-3.5 rounded-xl bg-surface-subtle border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-surface border border-slate-700 flex items-center justify-center text-primary">
                <Repeat className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-200">Return Loop Circuit</div>
                <div className="text-[11px] text-slate-400">
                  {preferLoop ? 'Route will loop back to your starting point' : 'One-way exploration ending at last waypoint'}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setPreferLoop(!preferLoop)}
              disabled={isGenerating}
              className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                preferLoop ? 'bg-primary' : 'bg-slate-700'
              }`}
            >
              <div
                className={`bg-slate-950 w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  preferLoop ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Error Banner if Generation Failed */}
          {generationError && (
            <div className="p-3.5 rounded-xl bg-red-950/80 border border-red-800 text-red-200 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1 space-y-1">
                <div className="font-semibold text-red-100">Route Generation Failed</div>
                <div className="leading-relaxed">{generationError}</div>
              </div>
            </div>
          )}

          {/* Submit Action Button */}
          <div className="pt-2">
            <Button
              variant="primary"
              size="lg"
              fullWidth
              disabled={isGenerating || !selectedLocation || !isOnline}
              leftIcon={isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5 fill-current" />}
              onClick={handleGenerateRoute}
            >
              {!isOnline 
                ? 'Network Required to Generate Routes' 
                : isGenerating 
                  ? 'Discovering Destinations & Calculating Route...' 
                  : 'Generate Waypoint Route'}
            </Button>
            <p className="text-center text-[11px] text-slate-500 mt-2">
              Retrieves real OpenStreetMap destinations and calculates true pedestrian path geometry
            </p>
          </div>
        </Card>
      )}

      {/* Safety and Privacy Guardrails Card */}
      <Card variant="subtle" className="space-y-3">
        <div className="flex items-center gap-2 text-slate-200">
          <ShieldAlert className="w-4 h-4 text-warning" />
          <h2 className="text-xs font-bold uppercase tracking-wider">Safety & Privacy Assurances</h2>
        </div>
        <ul className="text-xs text-slate-400 space-y-1.5 list-disc pl-4 leading-relaxed">
          <li><strong>Zero Remote Tracking:</strong> Location coordinates and mission logs remain entirely on your device in IndexedDB.</li>
          <li><strong>Pedestrian Rights-of-Way:</strong> Routes are calculated along validated walkways and pedestrian corridors.</li>
          <li><strong>Road Crossing Priority:</strong> Never look at your device while traversing street intersections or uneven terrain.</li>
        </ul>
      </Card>
    </div>
  );
}
