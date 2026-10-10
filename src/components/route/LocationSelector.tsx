'use client';

import React, { useState } from 'react';
import {
  MapPin,
  Navigation,
  Search,
  Loader2,
  AlertTriangle,
  Check,
  X,
  Crosshair
} from 'lucide-react';
import { GeoCoordinates, GeocodingResult } from '@/types/geo';
import { NominatimGeocodingService } from '@/services/geocoding';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';

export interface LocationSelectorProps {
  selectedLocation: GeoCoordinates | null;
  locationName: string;
  onLocationChange: (coords: GeoCoordinates, name: string) => void;
  disabled?: boolean;
}

export function LocationSelector({
  selectedLocation,
  locationName,
  onLocationChange,
  disabled = false,
}: LocationSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GeocodingResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isManualSearchOpen, setIsManualSearchOpen] = useState(false);

  const geocoder = new NominatimGeocodingService();

  // Request browser geolocation explicitly on user click
  const handleUseCurrentLocation = () => {
    setLocationError(null);
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser. Please search for a location manually.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        setIsLocating(false);
        const coords: GeoCoordinates = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };

        try {
          const name = await geocoder.reverse(coords);
          onLocationChange(coords, name);
        } catch {
          onLocationChange(coords, 'Current Location');
        }
      },
      (error) => {
        setIsLocating(false);
        let errorMsg = 'Unable to acquire GPS location.';
        if (error.code === error.PERMISSION_DENIED) {
          errorMsg = 'Location permission was denied. You can still search for any street, park, or city below.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMsg = 'GPS location is currently unavailable. Try typing a starting address.';
        } else if (error.code === error.TIMEOUT) {
          errorMsg = 'Location request timed out. Please try again or search manually.';
        }
        setLocationError(errorMsg);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      }
    );
  };

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setLocationError(null);
    try {
      const results = await geocoder.search(searchQuery);
      setSearchResults(results);
      if (results.length === 0) {
        setLocationError(`No locations found for "${searchQuery}". Try a different landmark, address, or city.`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to search location.';
      setLocationError(msg);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectResult = (result: GeocodingResult) => {
    onLocationChange(result.coordinates, result.name);
    setSearchResults([]);
    setSearchQuery('');
    setIsManualSearchOpen(false);
    setLocationError(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-primary" />
          <span>Starting Point</span>
        </label>
        {selectedLocation && (
          <Badge variant="success" size="sm">
            <Check className="w-3 h-3" />
            <span>Anchor Set</span>
          </Badge>
        )}
      </div>

      {/* Primary Location Card */}
      <div className="p-3.5 rounded-xl bg-surface-subtle border border-slate-800 space-y-3">
        {selectedLocation ? (
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-start gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-primary-dim text-primary flex items-center justify-center shrink-0 mt-0.5">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-100 truncate">{locationName}</div>
                <div className="text-xs font-mono text-slate-400">
                  {selectedLocation.latitude.toFixed(5)}, {selectedLocation.longitude.toFixed(5)}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsManualSearchOpen(!isManualSearchOpen)}
                disabled={disabled}
              >
                Change
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-xs text-slate-400">
              Choose your current position or search for a starting location:
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="secondary"
                size="md"
                fullWidth
                leftIcon={isLocating ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : <Crosshair className="w-4 h-4 text-primary" />}
                onClick={handleUseCurrentLocation}
                disabled={disabled || isLocating}
              >
                {isLocating ? 'Acquiring GPS...' : 'Use Current GPS'}
              </Button>
              <Button
                variant="outline"
                size="md"
                fullWidth
                leftIcon={<Search className="w-4 h-4 text-slate-300" />}
                onClick={() => setIsManualSearchOpen(true)}
                disabled={disabled}
              >
                Search Address / Park
              </Button>
            </div>
          </div>
        )}

        {/* Manual Search Drawer / Input */}
        {isManualSearchOpen && (
          <div className="pt-2 border-t border-slate-800 space-y-2">
            <form onSubmit={handleSearchSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Enter city, park, or landmark (e.g. Central Park, London Eye)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-surface border border-slate-700 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-primary"
                  autoFocus
                />
              </div>
              <Button
                type="submit"
                variant="secondary"
                size="sm"
                disabled={isSearching || !searchQuery.trim()}
              >
                {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Search'}
              </Button>
            </form>

            {/* Search Results List */}
            {searchResults.length > 0 && (
              <div className="rounded-lg bg-surface border border-slate-700 overflow-hidden divide-y divide-slate-800 max-h-48 overflow-y-auto">
                {searchResults.map((res, idx) => (
                  <button
                    key={`${res.name}-${idx}`}
                    type="button"
                    onClick={() => handleSelectResult(res)}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-slate-800/60 transition-colors flex items-start gap-2 text-slate-200"
                  >
                    <MapPin className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <div className="font-medium text-slate-100">{res.name}</div>
                      <div className="text-[11px] text-slate-400 truncate">{res.displayName}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Error Feedback Banner */}
        {locationError && (
          <div className="p-2.5 rounded-lg bg-amber-950/80 border border-amber-800 text-amber-200 text-xs flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1 leading-snug">{locationError}</div>
            <button
              onClick={() => setLocationError(null)}
              className="p-0.5 text-amber-400 hover:text-amber-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
