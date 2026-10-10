import { IRouteScorer } from './interfaces';
import { PointOfInterest, RouteLeg, RouteGenerationOptions } from '@/types/geo';
import { haversineDistance } from '@/lib/geo';

export class DeterministicRouteScorer implements IRouteScorer {
  scoreCandidate(
    route: {
      waypoints: PointOfInterest[];
      legs: RouteLeg[];
      totalDistanceMeters: number;
      totalDurationMinutes: number;
    },
    options: RouteGenerationOptions
  ): number {
    let score = 100;

    // 1. Duration alignment penalty (Ideal is matching targetDurationMinutes ± 10%)
    const durationDelta = Math.abs(route.totalDurationMinutes - options.targetDurationMinutes);
    const durationRatio = durationDelta / options.targetDurationMinutes;
    if (durationRatio > 0.4) {
      score -= Math.min(40, durationRatio * 50);
    } else {
      score += (1 - durationRatio) * 15;
    }

    // 2. Max radius check & penalty
    const maxRadiusMeters = options.maxRadiusKm * 1000;
    for (const wp of route.waypoints) {
      const distFromStart = haversineDistance(options.start, wp.coordinates);
      if (distFromStart > maxRadiusMeters) {
        const excess = (distFromStart - maxRadiusMeters) / maxRadiusMeters;
        score -= excess * 30; // heavy penalty for exceeding requested radius
      }
    }

    // 3. POI relevance and categorical diversity bonus
    const seenCategories = new Set<string>();
    let totalPoiRelevance = 0;

    for (const wp of route.waypoints) {
      totalPoiRelevance += wp.relevanceScore || 10;
      seenCategories.add(wp.category);
    }

    const avgRelevance = route.waypoints.length > 0 ? totalPoiRelevance / route.waypoints.length : 10;
    score += Math.min(25, avgRelevance);
    score += Math.min(15, seenCategories.size * 4); // Category diversity bonus

    // 4. Loop quality check
    if (options.preferLoop && route.waypoints.length > 1) {
      const lastWp = route.waypoints[route.waypoints.length - 1];
      const returnDistance = haversineDistance(lastWp.coordinates, options.start);
      // For a loop, returning to within 100m is ideal
      if (returnDistance <= 150) {
        score += 20;
      } else {
        const loopPenalty = (returnDistance / maxRadiusMeters) * 20;
        score -= Math.min(20, loopPenalty);
      }
    }

    // 5. Waypoint spacing penalty (penalize clustered redundant waypoints < 80m apart)
    for (let i = 0; i < route.waypoints.length - 1; i++) {
      const distBetween = haversineDistance(
        route.waypoints[i].coordinates,
        route.waypoints[i + 1].coordinates
      );
      if (distBetween < 80) {
        score -= 15;
      }
    }

    return Math.max(0, Math.round(score));
  }
}
