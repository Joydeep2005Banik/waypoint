import { GeoCoordinates, BoundingBox } from '@/types/geo';

const EARTH_RADIUS_METERS = 6371000;

/**
 * Calculates the great-circle distance between two geographic points using the Haversine formula.
 * Returns distance in meters.
 */
export function haversineDistance(a: GeoCoordinates, b: GeoCoordinates): number {
  if (
    typeof a?.latitude !== 'number' ||
    typeof a?.longitude !== 'number' ||
    typeof b?.latitude !== 'number' ||
    typeof b?.longitude !== 'number' ||
    isNaN(a.latitude) ||
    isNaN(a.longitude) ||
    isNaN(b.latitude) ||
    isNaN(b.longitude)
  ) {
    throw new Error('Invalid coordinates supplied to haversineDistance');
  }

  const toRad = (angle: number) => (angle * Math.PI) / 180;

  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);

  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const sinDLat2 = Math.sin(dLat / 2);
  const sinDLng2 = Math.sin(dLng / 2);

  const x =
    sinDLat2 * sinDLat2 +
    Math.cos(lat1) * Math.cos(lat2) * sinDLng2 * sinDLng2;

  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));

  return EARTH_RADIUS_METERS * c;
}

/**
 * Computes the minimum bounding box enclosing an array of coordinate points.
 */
export function calculateBoundingBox(
  points: GeoCoordinates[],
  paddingDegrees: number = 0.002
): BoundingBox {
  if (!points || points.length === 0) {
    throw new Error('Cannot calculate bounding box for empty points array');
  }

  let minLat = 90;
  let maxLat = -90;
  let minLng = 180;
  let maxLng = -180;

  for (const pt of points) {
    if (typeof pt.latitude === 'number' && !isNaN(pt.latitude)) {
      minLat = Math.min(minLat, pt.latitude);
      maxLat = Math.max(maxLat, pt.latitude);
    }
    if (typeof pt.longitude === 'number' && !isNaN(pt.longitude)) {
      minLng = Math.min(minLng, pt.longitude);
      maxLng = Math.max(maxLng, pt.longitude);
    }
  }

  return {
    minLat: minLat - paddingDegrees,
    maxLat: maxLat + paddingDegrees,
    minLng: minLng - paddingDegrees,
    maxLng: maxLng + paddingDegrees,
  };
}

/**
 * Checks if a point is within a given radius (in meters) from a center coordinate.
 */
export function isPointInRadius(
  center: GeoCoordinates,
  point: GeoCoordinates,
  radiusMeters: number
): boolean {
  return haversineDistance(center, point) <= radiusMeters;
}

/**
 * Validates coordinate values to ensure they fall within realistic global lat/lng boundaries.
 */
export function isValidCoordinate(coord: unknown): coord is GeoCoordinates {
  if (!coord || typeof coord !== 'object') return false;
  const c = coord as Record<string, unknown>;
  return (
    typeof c.latitude === 'number' &&
    !isNaN(c.latitude) &&
    c.latitude >= -90 &&
    c.latitude <= 90 &&
    typeof c.longitude === 'number' &&
    !isNaN(c.longitude) &&
    c.longitude >= -180 &&
    c.longitude <= 180
  );
}

/**
 * Estimates pedestrian walking time in minutes based on real distance in meters.
 * Assumes an average urban walking pace of ~4.8 km/h (80 meters/min).
 */
export function estimateWalkingDurationMinutes(distanceMeters: number): number {
  const paceMetersPerMinute = 80;
  return Math.max(1, Math.round(distanceMeters / paceMetersPerMinute));
}
