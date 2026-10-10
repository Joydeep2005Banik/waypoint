import { describe, it, expect, vi } from 'vitest';
import { RouteGenerator } from '@/services/route-generator';
import { IPoiService, IRoutingService, IGeocodingService } from '@/services/interfaces';
import { GeoCoordinates, PointOfInterest, RouteLeg, RouteGenerationOptions } from '@/types/geo';

describe('RouteGenerator', () => {
  const mockStart: GeoCoordinates = { latitude: 51.5074, longitude: -0.1278 };

  const mockPois: PointOfInterest[] = [
    {
      id: 'poi-1',
      name: 'St James Park',
      category: 'park',
      coordinates: { latitude: 51.5045, longitude: -0.1325 },
      relevanceScore: 35,
      tags: { name: 'St James Park', leisure: 'park' },
    },
    {
      id: 'poi-2',
      name: 'Jubilee Gardens',
      category: 'park',
      coordinates: { latitude: 51.5033, longitude: -0.1195 },
      relevanceScore: 30,
      tags: { name: 'Jubilee Gardens', leisure: 'park' },
    },
    {
      id: 'poi-3',
      name: 'Trafalgar Monument',
      category: 'monument',
      coordinates: { latitude: 51.5080, longitude: -0.1280 },
      relevanceScore: 25,
      tags: { name: 'Trafalgar Monument', historic: 'monument' },
    },
  ];

  const mockLegs: RouteLeg[] = [
    {
      fromWaypointId: 'wp-0',
      toWaypointId: 'wp-1',
      distanceMeters: 650,
      durationSeconds: 450,
      geometry: [mockStart, mockPois[0].coordinates],
      steps: [{ instruction: 'Walk south', distanceMeters: 650, durationSeconds: 450 }],
    },
    {
      fromWaypointId: 'wp-1',
      toWaypointId: 'wp-2',
      distanceMeters: 750,
      durationSeconds: 520,
      geometry: [mockPois[0].coordinates, mockPois[1].coordinates],
      steps: [{ instruction: 'Walk east', distanceMeters: 750, durationSeconds: 520 }],
    },
  ];

  const mockPoiService: IPoiService = {
    fetchPois: vi.fn().mockResolvedValue(mockPois),
  };

  const mockRoutingService: IRoutingService = {
    calculateRoute: vi.fn().mockResolvedValue({
      legs: mockLegs,
      totalDistanceMeters: 1400,
      totalDurationSeconds: 970,
    }),
  };

  const mockGeocodingService: IGeocodingService = {
    search: vi.fn().mockResolvedValue([]),
    reverse: vi.fn().mockResolvedValue('Trafalgar Square, London'),
  };

  it('generates a complete prepared route with waypoints, legs, and metadata', async () => {
    const generator = new RouteGenerator(
      mockPoiService,
      mockRoutingService,
      undefined,
      mockGeocodingService
    );

    const options: RouteGenerationOptions = {
      start: mockStart,
      style: 'greenway',
      targetDurationMinutes: 30,
      maxRadiusKm: 1.5,
      preferLoop: true,
    };

    const route = await generator.generateRoute(options);

    expect(route).toBeDefined();
    expect(route.waypoints.length).toBeGreaterThanOrEqual(3);
    expect(route.waypoints[0].isStart).toBe(true);
    expect(route.waypoints[route.waypoints.length - 1].isEnd).toBe(true);
    expect(route.legs.length).toBeGreaterThanOrEqual(1);
    expect(route.totalDistanceMeters).toBe(1400);
    expect(route.totalDurationMinutes).toBe(16);
    expect(route.boundingBox).toBeDefined();
    expect(route.candidateScore).toBeGreaterThan(0);
  });

  it('throws descriptive error when fewer than 2 POIs are returned', async () => {
    const emptyPoiService: IPoiService = {
      fetchPois: vi.fn().mockResolvedValue([mockPois[0]]), // only 1 POI
    };

    const generator = new RouteGenerator(
      emptyPoiService,
      mockRoutingService,
      undefined,
      mockGeocodingService
    );

    await expect(
      generator.generateRoute({
        start: mockStart,
        style: 'greenway',
        targetDurationMinutes: 30,
        maxRadiusKm: 1.0,
        preferLoop: false,
      })
    ).rejects.toThrow(/Insufficient mapped points of interest found/);
  });

  it('throws descriptive error when routing service fails', async () => {
    const failingRoutingService: IRoutingService = {
      calculateRoute: vi.fn().mockRejectedValue(new Error('No pedestrian path available')),
    };

    const generator = new RouteGenerator(
      mockPoiService,
      failingRoutingService,
      undefined,
      mockGeocodingService
    );

    await expect(
      generator.generateRoute({
        start: mockStart,
        style: 'greenway',
        targetDurationMinutes: 30,
        maxRadiusKm: 1.0,
        preferLoop: false,
      })
    ).rejects.toThrow(/Failed to calculate valid pedestrian route/);
  });

  it('validates coordinate boundaries and parameter bounds', async () => {
    const generator = new RouteGenerator(mockPoiService, mockRoutingService);

    // Invalid start coords
    await expect(
      generator.generateRoute({
        start: { latitude: 95, longitude: 0 },
        style: 'greenway',
        targetDurationMinutes: 30,
        maxRadiusKm: 1.0,
        preferLoop: false,
      })
    ).rejects.toThrow('Invalid starting coordinates');

    // Invalid duration
    await expect(
      generator.generateRoute({
        start: mockStart,
        style: 'greenway',
        targetDurationMinutes: 5, // < 10 mins
        maxRadiusKm: 1.0,
        preferLoop: false,
      })
    ).rejects.toThrow('Target duration must be between 10 and 180 minutes.');

    // Invalid radius
    await expect(
      generator.generateRoute({
        start: mockStart,
        style: 'greenway',
        targetDurationMinutes: 30,
        maxRadiusKm: 0.1, // < 0.2 km
        preferLoop: false,
      })
    ).rejects.toThrow('Maximum exploration radius must be between 0.2 km and 10 km.');
  });
});
