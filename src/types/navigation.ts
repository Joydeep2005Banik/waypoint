import { GeoCoordinates, Waypoint, RouteLeg, PreparedRoute } from './geo';

export type NavigationState =
  | 'READY'
  | 'NAVIGATING'
  | 'ARRIVAL_PENDING'
  | 'WAYPOINT_REACHED'
  | 'PAUSED'
  | 'REROUTING'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'LOCATION_UNAVAILABLE';

export type GpsAccuracyLevel = 'GOOD' | 'MODERATE' | 'POOR' | 'UNAVAILABLE';

export interface GPSReading {
  latitude: number;
  longitude: number;
  accuracy: number; // meters
  timestamp: number; // epoch ms
  speed?: number | null; // m/s
  heading?: number | null; // degrees
}

export interface NavigationConfig {
  arrivalRadiusMeters: number; // default 20m
  maxGpsAccuracyMeters: number; // default 30m
  confirmationDwellMs: number; // default 2000ms
  maxWalkingSpeedMps: number; // default 6.0 m/s (~21 km/h) to filter teleport noise
  deviationThresholdMeters: number; // default 120m
}

export interface NavigationSnapshot {
  state: NavigationState;
  currentWaypointIndex: number;
  currentWaypoint: Waypoint;
  nextWaypoint: Waypoint | null;
  distanceToCurrentWaypointMeters: number;
  distanceToRouteMeters: number;
  isOffRoute: boolean;
  lastValidGps: GPSReading | null;
  gpsAccuracyStatus: GpsAccuracyLevel;
  arrivalPendingProgress: number; // 0.0 to 1.0
  timeElapsedSeconds: number;
  totalDistanceWalkedMeters: number;
  route: PreparedRoute;
  statusMessage: string;
  errorMessage: string | null;
  visitedWaypointIds: string[];
}
