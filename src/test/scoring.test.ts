import { describe, it, expect } from 'vitest';
import { DeterministicRouteScorer } from '@/services/scoring';
import { PointOfInterest, RouteLeg, RouteGenerationOptions } from '@/types/geo';

describe('DeterministicRouteScorer', () => {
  const scorer = new DeterministicRouteScorer();
  const start = { latitude: 51.5074, longitude: -0.1278 };

  const options: RouteGenerationOptions = {
    start,
    style: 'greenway',
    targetDurationMinutes: 30,
    maxRadiusKm: 1.5,
    preferLoop: true,
  };

  const samplePois: PointOfInterest[] = [
    {
      id: 'poi-1',
      name: 'St James Park',
      category: 'park',
      coordinates: { latitude: 51.5045, longitude: -0.1325 },
      relevanceScore: 25,
      tags: { name: 'St James Park', leisure: 'park' },
    },
    {
      id: 'poi-2',
      name: 'Victoria Memorial',
      category: 'monument',
      coordinates: { latitude: 51.5018, longitude: -0.1406 },
      relevanceScore: 30,
      tags: { name: 'Victoria Memorial', historic: 'monument' },
    },
    {
      id: 'poi-3',
      name: 'Green Park',
      category: 'park',
      coordinates: { latitude: 51.5065, longitude: -0.1435 },
      relevanceScore: 20,
      tags: { name: 'Green Park', leisure: 'park' },
    },
  ];

  const sampleLegs: RouteLeg[] = [
    {
      fromWaypointId: 'wp-0',
      toWaypointId: 'wp-1',
      distanceMeters: 800,
      durationSeconds: 600,
      geometry: [start, samplePois[0].coordinates],
    },
    {
      fromWaypointId: 'wp-1',
      toWaypointId: 'wp-2',
      distanceMeters: 700,
      durationSeconds: 540,
      geometry: [samplePois[0].coordinates, samplePois[1].coordinates],
    },
    {
      fromWaypointId: 'wp-2',
      toWaypointId: 'wp-3',
      distanceMeters: 650,
      durationSeconds: 480,
      geometry: [samplePois[1].coordinates, samplePois[2].coordinates],
    },
    {
      fromWaypointId: 'wp-3',
      toWaypointId: 'wp-0',
      distanceMeters: 850,
      durationSeconds: 660,
      geometry: [samplePois[2].coordinates, start],
    },
  ];

  it('awards high score for a route that matches target duration, radius, and loop preference', () => {
    const score = scorer.scoreCandidate(
      {
        waypoints: samplePois,
        legs: sampleLegs,
        totalDistanceMeters: 3000,
        totalDurationMinutes: 38,
      },
      options
    );

    expect(score).toBeGreaterThan(80);
  });

  it('penalizes routes that severely deviate from target duration', () => {
    const normalScore = scorer.scoreCandidate(
      {
        waypoints: samplePois,
        legs: sampleLegs,
        totalDistanceMeters: 2500,
        totalDurationMinutes: 30,
      },
      options
    );

    const deviatedScore = scorer.scoreCandidate(
      {
        waypoints: samplePois,
        legs: sampleLegs,
        totalDistanceMeters: 8000,
        totalDurationMinutes: 100,
      },
      options
    );

    expect(deviatedScore).toBeLessThan(normalScore);
  });

  it('penalizes routes that violate maximum radius constraint', () => {
    const outOfBoundsPoi: PointOfInterest = {
      id: 'poi-far',
      name: 'Far Away Landmark',
      category: 'attraction',
      coordinates: { latitude: 51.5500, longitude: -0.1278 }, // ~5km away
      relevanceScore: 20,
      tags: {},
    };

    const outOfBoundsScore = scorer.scoreCandidate(
      {
        waypoints: [...samplePois, outOfBoundsPoi],
        legs: sampleLegs,
        totalDistanceMeters: 3000,
        totalDurationMinutes: 30,
      },
      options
    );

    const withinBoundsScore = scorer.scoreCandidate(
      {
        waypoints: samplePois,
        legs: sampleLegs,
        totalDistanceMeters: 3000,
        totalDurationMinutes: 30,
      },
      options
    );

    expect(outOfBoundsScore).toBeLessThan(withinBoundsScore);
  });

  it('penalizes clustered redundant waypoints placed too close to each other', () => {
    const clusteredPois: PointOfInterest[] = [
      samplePois[0],
      {
        ...samplePois[0],
        id: 'poi-1-dup',
        coordinates: {
          latitude: samplePois[0].coordinates.latitude + 0.0001, // ~10m away
          longitude: samplePois[0].coordinates.longitude,
        },
      },
    ];

    const score = scorer.scoreCandidate(
      {
        waypoints: clusteredPois,
        legs: sampleLegs.slice(0, 1),
        totalDistanceMeters: 1000,
        totalDurationMinutes: 15,
      },
      options
    );

    expect(score).toBeLessThan(90);
  });
});
