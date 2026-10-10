import { GeoCoordinates } from '@/types/geo';
import { haversineDistance } from './geo';

/**
 * Calculates the shortest distance in meters from a point P to a line segment AB.
 */
export function distanceToSegment(
  p: GeoCoordinates,
  a: GeoCoordinates,
  b: GeoCoordinates
): number {
  const dAB = haversineDistance(a, b);
  if (dAB === 0) {
    return haversineDistance(p, a);
  }

  // Vector math in local equirectangular projection
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const meanLat = toRad((a.latitude + b.latitude) / 2);

  const xP = toRad(p.longitude - a.longitude) * Math.cos(meanLat);
  const yP = toRad(p.latitude - a.latitude);

  const xB = toRad(b.longitude - a.longitude) * Math.cos(meanLat);
  const yB = toRad(b.latitude - a.latitude);

  // Parameter t of perpendicular projection onto segment AB
  const dot = xP * xB + yP * yB;
  const lenSq = xB * xB + yB * yB;
  let t = lenSq === 0 ? 0 : dot / lenSq;
  t = Math.max(0, Math.min(1, t)); // Clamp to segment

  const projLat = a.latitude + t * (b.latitude - a.latitude);
  const projLng = a.longitude + t * (b.longitude - a.longitude);

  return haversineDistance(p, { latitude: projLat, longitude: projLng });
}

/**
 * Calculates the minimum distance in meters from a point P to any segment of a polyline.
 */
export function distanceToPolyline(
  point: GeoCoordinates,
  polyline: GeoCoordinates[]
): number {
  if (!polyline || polyline.length === 0) {
    return Infinity;
  }
  if (polyline.length === 1) {
    return haversineDistance(point, polyline[0]);
  }

  let minDistance = Infinity;
  for (let i = 0; i < polyline.length - 1; i++) {
    const d = distanceToSegment(point, polyline[i], polyline[i + 1]);
    if (d < minDistance) {
      minDistance = d;
    }
  }

  return minDistance;
}
