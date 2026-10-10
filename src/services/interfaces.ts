import {
  GeoCoordinates,
  GeocodingResult,
  PointOfInterest,
  ExplorationStyle,
  RouteLeg,
  PreparedRoute,
  RouteGenerationOptions,
} from '@/types/geo';

export interface IGeocodingService {
  search(query: string): Promise<GeocodingResult[]>;
  reverse(coords: GeoCoordinates): Promise<string>;
}

export interface IPoiService {
  fetchPois(
    center: GeoCoordinates,
    radiusMeters: number,
    style: ExplorationStyle
  ): Promise<PointOfInterest[]>;
}

export interface IRoutingService {
  calculateRoute(
    waypoints: GeoCoordinates[]
  ): Promise<{
    legs: RouteLeg[];
    totalDistanceMeters: number;
    totalDurationSeconds: number;
  }>;
}

export interface IRouteScorer {
  scoreCandidate(
    route: {
      waypoints: PointOfInterest[];
      legs: RouteLeg[];
      totalDistanceMeters: number;
      totalDurationMinutes: number;
    },
    options: RouteGenerationOptions
  ): number;
}

export interface IRouteGenerator {
  generateRoute(options: RouteGenerationOptions): Promise<PreparedRoute>;
}
