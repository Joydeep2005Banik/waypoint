import { IRoutingService } from './interfaces';
import { GeoCoordinates, RouteLeg, RouteStep } from '@/types/geo';

export class OsrmRoutingService implements IRoutingService {
  private baseUrl: string;

  constructor(
    baseUrl: string = process.env.NEXT_PUBLIC_OSRM_ROUTING_URL || 'https://router.project-osrm.org'
  ) {
    this.baseUrl = baseUrl;
  }

  async calculateRoute(
    waypoints: GeoCoordinates[]
  ): Promise<{
    legs: RouteLeg[];
    totalDistanceMeters: number;
    totalDurationSeconds: number;
  }> {
    if (!waypoints || waypoints.length < 2) {
      throw new Error('Routing requires at least two waypoints.');
    }

    // Format coordinates as lng,lat;lng,lat;...
    const coordString = waypoints
      .map((wp) => `${wp.longitude.toFixed(6)},${wp.latitude.toFixed(6)}`)
      .join(';');

    const url = new URL(`${this.baseUrl}/route/v1/foot/${coordString}`);
    url.searchParams.set('overview', 'full');
    url.searchParams.set('geometries', 'geojson');
    url.searchParams.set('steps', 'true');
    url.searchParams.set('continue_straight', 'true');

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const response = await fetch(url.toString(), {
        headers: {
          Accept: 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Routing service returned status HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
        throw new Error(
          `No valid pedestrian route could be found connecting the selected waypoints (${data.message || data.code || 'Unknown error'}).`
        );
      }

      const route = data.routes[0];
      const rawLegs = route.legs || [];
      const parsedLegs: RouteLeg[] = [];

      for (let i = 0; i < rawLegs.length; i++) {
        const rawLeg = rawLegs[i];
        const fromWaypointId = `wp-${i}`;
        const toWaypointId = `wp-${i + 1}`;

        // Extract geometry points for this leg
        const legGeometry: GeoCoordinates[] = [];
        if (rawLeg.steps && Array.isArray(rawLeg.steps)) {
          for (const step of rawLeg.steps) {
            if (step.geometry && Array.isArray(step.geometry.coordinates)) {
              for (const [lng, lat] of step.geometry.coordinates) {
                legGeometry.push({ latitude: lat, longitude: lng });
              }
            }
          }
        }

        // Fallback to route geometry slice if step geometry was empty
        if (legGeometry.length === 0 && route.geometry?.coordinates) {
          const allCoords = route.geometry.coordinates;
          for (const [lng, lat] of allCoords) {
            legGeometry.push({ latitude: lat, longitude: lng });
          }
        }

        // Parse turn-by-turn steps
        const steps: RouteStep[] = [];
        if (rawLeg.steps && Array.isArray(rawLeg.steps)) {
          for (const step of rawLeg.steps) {
            const maneuver = step.maneuver || {};
            const type = maneuver.type || 'turn';
            const modifier = maneuver.modifier ? ` ${maneuver.modifier}` : '';
            const name = step.name || 'pedestrian path';
            const instruction = step.maneuver?.instruction || `${type}${modifier} onto ${name}`;

            steps.push({
              instruction,
              distanceMeters: Math.round(step.distance || 0),
              durationSeconds: Math.round(step.duration || 0),
              name: step.name || undefined,
            });
          }
        }

        parsedLegs.push({
          fromWaypointId,
          toWaypointId,
          distanceMeters: Math.round(rawLeg.distance || 0),
          durationSeconds: Math.round(rawLeg.duration || 0),
          geometry: legGeometry,
          steps,
        });
      }

      return {
        legs: parsedLegs,
        totalDistanceMeters: Math.round(route.distance),
        totalDurationSeconds: Math.round(route.duration),
      };
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Routing service request timed out. Please try again.');
      }
      throw error;
    }
  }
}
