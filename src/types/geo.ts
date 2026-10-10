export interface GeoCoordinates {
  latitude: number;
  longitude: number;
}

export interface BoundingBox {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
}

export type ExplorationStyle = 'greenway' | 'heritage' | 'discovery' | 'quiet';

export interface PointOfInterest {
  id: string;
  name: string;
  coordinates: GeoCoordinates;
  category: string;
  relevanceScore: number;
  tags: Record<string, string>;
  distanceFromStartMeters?: number;
}

export interface RouteStep {
  instruction: string;
  distanceMeters: number;
  durationSeconds: number;
  name?: string;
}

export interface RouteLeg {
  fromWaypointId: string;
  toWaypointId: string;
  distanceMeters: number;
  durationSeconds: number;
  geometry: GeoCoordinates[];
  steps?: RouteStep[];
}

export interface Waypoint {
  id: string;
  order: number;
  name: string;
  coordinates: GeoCoordinates;
  arrivalRadiusMeters: number;
  instruction: string;
  category: string;
  tags?: Record<string, string>;
  isStart?: boolean;
  isEnd?: boolean;
}

export interface PreparedRoute {
  id: string;
  title: string;
  explorationStyle: ExplorationStyle;
  startLocation: {
    name: string;
    coordinates: GeoCoordinates;
  };
  targetDurationMinutes: number;
  maxRadiusKm: number;
  isLoop: boolean;
  waypoints: Waypoint[];
  legs: RouteLeg[];
  totalDistanceMeters: number;
  totalDurationMinutes: number;
  boundingBox: BoundingBox;
  createdAt: string;
  candidateScore: number;
}

export interface RouteGenerationOptions {
  start: GeoCoordinates;
  startName?: string;
  style: ExplorationStyle;
  targetDurationMinutes: number;
  maxRadiusKm: number;
  preferLoop: boolean;
}

export interface GeocodingResult {
  name: string;
  displayName: string;
  coordinates: GeoCoordinates;
  boundingBox?: BoundingBox;
  type?: string;
}
