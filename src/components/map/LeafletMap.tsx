'use client';

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { GeoCoordinates, Waypoint, RouteLeg, BoundingBox } from '@/types/geo';

export interface LeafletMapProps {
  center?: GeoCoordinates;
  zoom?: number;
  waypoints?: Waypoint[];
  legs?: RouteLeg[];
  boundingBox?: BoundingBox;
  selectedLocation?: GeoCoordinates | null;
  onLocationSelect?: (coords: GeoCoordinates) => void;
  interactive?: boolean;
  className?: string;
}

export default function LeafletMap({
  center = { latitude: 51.505, longitude: -0.09 },
  zoom = 14,
  waypoints = [],
  legs = [],
  boundingBox,
  selectedLocation,
  onLocationSelect,
  interactive = true,
  className = 'h-[360px] w-full rounded-2xl overflow-hidden',
}: LeafletMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const onLocationSelectRef = useRef(onLocationSelect);

  useEffect(() => {
    onLocationSelectRef.current = onLocationSelect;
  }, [onLocationSelect]);

  // Initialize map instance
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [center.latitude, center.longitude],
        zoom,
        zoomControl: true,
        attributionControl: true,
      });

      // OpenStreetMap standard tile layer with mandatory attribution
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
      }).addTo(map);

      const layerGroup = L.layerGroup().addTo(map);
      layerGroupRef.current = layerGroup;
      mapInstanceRef.current = map;

      // Handle map clicks for custom pin placement
      map.on('click', (e: L.LeafletMouseEvent) => {
        if (onLocationSelectRef.current) {
          onLocationSelectRef.current({
            latitude: e.latlng.lat,
            longitude: e.latlng.lng,
          });
        }
      });
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  // Update map contents when waypoints, legs, or bounds change
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = layerGroupRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();

    // 1. Draw Route Polylines
    if (legs && legs.length > 0) {
      const allPathLatLngs: [number, number][] = [];

      for (const leg of legs) {
        const legLatLngs = leg.geometry.map((pt): [number, number] => [
          pt.latitude,
          pt.longitude,
        ]);
        allPathLatLngs.push(...legLatLngs);
      }

      if (allPathLatLngs.length > 0) {
        // High contrast background border line
        L.polyline(allPathLatLngs, {
          color: '#090d16',
          weight: 7,
          opacity: 0.9,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(layerGroup);

        // Active high-visibility primary route line
        L.polyline(allPathLatLngs, {
          color: '#0ea5e9', // Accent Sky Blue
          weight: 4,
          opacity: 1.0,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(layerGroup);
      }
    }

    // 2. Draw Waypoint Markers
    if (waypoints && waypoints.length > 0) {
      waypoints.forEach((wp) => {
        let iconHtml = '';
        if (wp.isStart) {
          iconHtml = `
            <div style="
              background: #10b981;
              color: #090d16;
              width: 32px;
              height: 32px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: 800;
              font-size: 13px;
              border: 2.5px solid #ffffff;
              box-shadow: 0 4px 10px rgba(0,0,0,0.5);
            ">S</div>
          `;
        } else if (wp.isEnd) {
          iconHtml = `
            <div style="
              background: #f59e0b;
              color: #090d16;
              width: 32px;
              height: 32px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: 800;
              font-size: 13px;
              border: 2.5px solid #ffffff;
              box-shadow: 0 4px 10px rgba(0,0,0,0.5);
            ">E</div>
          `;
        } else {
          iconHtml = `
            <div style="
              background: #1e293b;
              color: #38bdf8;
              width: 28px;
              height: 28px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: 700;
              font-size: 12px;
              border: 2px solid #38bdf8;
              box-shadow: 0 3px 8px rgba(0,0,0,0.4);
            ">${wp.order}</div>
          `;
        }

        const customIcon = L.divIcon({
          html: iconHtml,
          className: 'custom-waypoint-icon',
          iconSize: [32, 32],
          iconAnchor: [16, 16],
          popupAnchor: [0, -18],
        });

        const marker = L.marker([wp.coordinates.latitude, wp.coordinates.longitude], {
          icon: customIcon,
        }).addTo(layerGroup);

        marker.bindPopup(`
          <div style="color: #0f172a; font-family: sans-serif; font-size: 12px; min-width: 140px;">
            <div style="font-weight: 700; font-size: 13px; margin-bottom: 2px;">${wp.name}</div>
            <div style="color: #64748b; margin-bottom: 4px; text-transform: capitalize;">${wp.category}</div>
            <div style="color: #334155; line-height: 1.3;">${wp.instruction}</div>
          </div>
        `);
      });
    }

    // 3. Draw Selected / Current Location Pin if specified
    if (selectedLocation && (!waypoints || waypoints.length === 0)) {
      const pinIcon = L.divIcon({
        html: `
          <div style="
            background: #10b981;
            width: 18px;
            height: 18px;
            border-radius: 50%;
            border: 3px solid #ffffff;
            box-shadow: 0 0 12px #10b981;
          "></div>
        `,
        className: 'current-pos-icon',
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });

      L.marker([selectedLocation.latitude, selectedLocation.longitude], {
        icon: pinIcon,
      }).addTo(layerGroup);
    }

    // 4. Fit bounds
    if (boundingBox) {
      const southWest = L.latLng(boundingBox.minLat, boundingBox.minLng);
      const northEast = L.latLng(boundingBox.maxLat, boundingBox.maxLng);
      const bounds = L.latLngBounds(southWest, northEast);
      map.fitBounds(bounds, { padding: [40, 40] });
    } else if (selectedLocation) {
      map.setView([selectedLocation.latitude, selectedLocation.longitude], zoom);
    }
  }, [waypoints, legs, boundingBox, selectedLocation, zoom]);

  return (
    <div className={className}>
      <div ref={mapContainerRef} className="w-full h-full min-h-[300px]" />
    </div>
  );
}
