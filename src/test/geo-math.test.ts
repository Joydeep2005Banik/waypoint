import { describe, it, expect } from 'vitest';
import {
  haversineDistance,
  calculateBoundingBox,
  isPointInRadius,
  isValidCoordinate,
  estimateWalkingDurationMinutes,
} from '@/lib/geo';
import { GeoCoordinates } from '@/types/geo';

describe('Geographic Math Utilities', () => {
  const trafalgar: GeoCoordinates = { latitude: 51.5074, longitude: -0.1278 };
  const jubileeGardens: GeoCoordinates = { latitude: 51.5033, longitude: -0.1195 };

  describe('haversineDistance', () => {
    it('calculates realistic pedestrian distance between two London points (~740m)', () => {
      const distance = haversineDistance(trafalgar, jubileeGardens);
      expect(distance).toBeGreaterThan(700);
      expect(distance).toBeLessThan(800);
    });

    it('returns 0 for identical coordinates', () => {
      const distance = haversineDistance(trafalgar, trafalgar);
      expect(distance).toBe(0);
    });

    it('throws error when coordinates contain NaN or invalid types', () => {
      expect(() =>
        haversineDistance({ latitude: NaN, longitude: -0.1278 }, jubileeGardens)
      ).toThrow('Invalid coordinates');

      expect(() =>
        haversineDistance(trafalgar, { latitude: 51.5, longitude: undefined as unknown as number })
      ).toThrow('Invalid coordinates');
    });
  });

  describe('calculateBoundingBox', () => {
    it('encloses all provided points with appropriate padding', () => {
      const points: GeoCoordinates[] = [
        { latitude: 51.5074, longitude: -0.1278 },
        { latitude: 51.5033, longitude: -0.1195 },
        { latitude: 51.5007, longitude: -0.1246 },
      ];

      const bbox = calculateBoundingBox(points, 0.005);
      expect(bbox.minLat).toBeLessThan(51.5007);
      expect(bbox.maxLat).toBeGreaterThan(51.5074);
      expect(bbox.minLng).toBeLessThan(-0.1278);
      expect(bbox.maxLng).toBeGreaterThan(-0.1195);
    });

    it('throws error for empty array', () => {
      expect(() => calculateBoundingBox([])).toThrow('Cannot calculate bounding box');
    });
  });

  describe('isPointInRadius', () => {
    it('returns true when point is within radius', () => {
      const within1km = isPointInRadius(trafalgar, jubileeGardens, 1000);
      expect(within1km).toBe(true);
    });

    it('returns false when point exceeds radius', () => {
      const within500m = isPointInRadius(trafalgar, jubileeGardens, 500);
      expect(within500m).toBe(false);
    });
  });

  describe('isValidCoordinate', () => {
    it('validates correct latitude and longitude ranges', () => {
      expect(isValidCoordinate({ latitude: 51.5, longitude: -0.1 })).toBe(true);
      expect(isValidCoordinate({ latitude: 0, longitude: 0 })).toBe(true);
      expect(isValidCoordinate({ latitude: -90, longitude: 180 })).toBe(true);
    });

    it('rejects out of bounds and malformed coordinates', () => {
      expect(isValidCoordinate({ latitude: 91, longitude: 0 })).toBe(false);
      expect(isValidCoordinate({ latitude: 51, longitude: 181 })).toBe(false);
      expect(isValidCoordinate({ latitude: '51.5', longitude: -0.1 })).toBe(false);
      expect(isValidCoordinate(null)).toBe(false);
      expect(isValidCoordinate({})).toBe(false);
    });
  });

  describe('estimateWalkingDurationMinutes', () => {
    it('calculates duration based on 80 meters per minute pace', () => {
      expect(estimateWalkingDurationMinutes(800)).toBe(10);
      expect(estimateWalkingDurationMinutes(2400)).toBe(30);
      expect(estimateWalkingDurationMinutes(10)).toBe(1); // min 1 minute
    });
  });
});
