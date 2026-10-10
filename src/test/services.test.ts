import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NominatimGeocodingService } from '@/services/geocoding';
import { OverpassPoiService } from '@/services/poi';
import { OsrmRoutingService } from '@/services/routing';
import osmPoisFixture from './fixtures/osm-pois.json';
import osrmRouteFixture from './fixtures/osrm-routes.json';

describe('Geographic External Services', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('NominatimGeocodingService', () => {
    it('parses search results correctly from API response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          {
            lat: '51.5074',
            lon: '-0.1278',
            name: 'Trafalgar Square',
            display_name: 'Trafalgar Square, Westminster, London, UK',
            type: 'plaza',
          },
        ],
      });

      const service = new NominatimGeocodingService();
      const results = await service.search('Trafalgar');

      expect(results.length).toBe(1);
      expect(results[0].name).toBe('Trafalgar Square');
      expect(results[0].coordinates.latitude).toBe(51.5074);
      expect(results[0].coordinates.longitude).toBe(-0.1278);
    });

    it('handles empty queries gracefully without making network requests', async () => {
      const fetchMock = vi.fn();
      global.fetch = fetchMock;

      const service = new NominatimGeocodingService();
      const results = await service.search('   ');

      expect(results).toEqual([]);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('handles network / HTTP errors gracefully', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
      });

      const service = new NominatimGeocodingService();
      await expect(service.search('London')).rejects.toThrow('Geocoding failed with status HTTP 503');
    });
  });

  describe('OverpassPoiService', () => {
    it('parses real Overpass JSON elements into PointOfInterest models and filters private property', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => osmPoisFixture,
      });

      const service = new OverpassPoiService();
      const pois = await service.fetchPois(
        { latitude: 51.5074, longitude: -0.1278 },
        2000,
        'greenway'
      );

      expect(pois.length).toBeGreaterThan(0);
      // Private courtyard (id 1006) must be filtered out
      const privatePoi = pois.find((p) => p.name === 'Private Gated Courtyard');
      expect(privatePoi).toBeUndefined();

      // Public parks must be present
      const park = pois.find((p) => p.name === 'Jubilee Gardens');
      expect(park).toBeDefined();
      expect(park?.category).toBe('park');
    });

    it('throws descriptive error on service failure status', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
      });

      const service = new OverpassPoiService();
      await expect(
        service.fetchPois({ latitude: 51.5, longitude: -0.1 }, 1000, 'greenway')
      ).rejects.toThrow(/Overpass POI service error/);
    });
  });

  describe('OsrmRoutingService', () => {
    it('parses real OSRM foot profile response into RouteLegs and step instructions', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => osrmRouteFixture,
      });

      const service = new OsrmRoutingService();
      const result = await service.calculateRoute([
        { latitude: 51.5074, longitude: -0.1278 },
        { latitude: 51.5033, longitude: -0.1195 },
        { latitude: 51.5007, longitude: -0.1246 },
      ]);

      expect(result.totalDistanceMeters).toBe(1170);
      expect(result.totalDurationSeconds).toBe(781);
      expect(result.legs.length).toBe(2);
      expect(result.legs[0].steps?.[0].instruction).toContain('Depart southeast on Northumberland Avenue');
      expect(result.legs[0].geometry.length).toBeGreaterThan(0);
    });

    it('throws descriptive error when OSRM returns non-Ok code', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          code: 'NoRoute',
          message: 'Impossible route between coordinates',
        }),
      });

      const service = new OsrmRoutingService();
      await expect(
        service.calculateRoute([
          { latitude: 51.5074, longitude: -0.1278 },
          { latitude: 51.5033, longitude: -0.1195 },
        ])
      ).rejects.toThrow(/No valid pedestrian route could be found/);
    });
  });
});
