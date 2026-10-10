import { describe, it, expect, beforeEach } from 'vitest';
import { NavigationStateMachine } from '@/services/navigation/navigation-state-machine';
import { PreparedRoute, Waypoint, RouteLeg } from '@/types/geo';
import { GPSReading } from '@/types/navigation';

describe('NavigationStateMachine', () => {
  const mockStart = { latitude: 51.5074, longitude: -0.1278 };
  const mockWp1 = { latitude: 51.5045, longitude: -0.1325 }; // ~400m away
  const mockWp2 = { latitude: 51.5018, longitude: -0.1406 }; // ~650m away

  const sampleWaypoints: Waypoint[] = [
    {
      id: 'wp-start',
      order: 1,
      name: 'Start Square',
      coordinates: mockStart,
      arrivalRadiusMeters: 20,
      instruction: 'Start mission',
      category: 'start',
      isStart: true,
    },
    {
      id: 'wp-1',
      order: 2,
      name: 'St James Park',
      coordinates: mockWp1,
      arrivalRadiusMeters: 20,
      instruction: 'Walk to St James Park',
      category: 'park',
    },
    {
      id: 'wp-2',
      order: 3,
      name: 'Victoria Memorial',
      coordinates: mockWp2,
      arrivalRadiusMeters: 20,
      instruction: 'Walk to Memorial',
      category: 'monument',
      isEnd: true,
    },
  ];

  const sampleLegs: RouteLeg[] = [
    {
      fromWaypointId: 'wp-start',
      toWaypointId: 'wp-1',
      distanceMeters: 450,
      durationSeconds: 320,
      geometry: [mockStart, mockWp1],
    },
    {
      fromWaypointId: 'wp-1',
      toWaypointId: 'wp-2',
      distanceMeters: 650,
      durationSeconds: 480,
      geometry: [mockWp1, mockWp2],
    },
  ];

  const mockRoute: PreparedRoute = {
    id: 'route-test-1',
    title: 'Test Walking Mission',
    explorationStyle: 'greenway',
    startLocation: { name: 'Start Square', coordinates: mockStart },
    targetDurationMinutes: 30,
    maxRadiusKm: 1.5,
    isLoop: false,
    waypoints: sampleWaypoints,
    legs: sampleLegs,
    totalDistanceMeters: 1100,
    totalDurationMinutes: 14,
    boundingBox: { minLat: 51.5, minLng: -0.15, maxLat: 51.52, maxLng: -0.12 },
    createdAt: new Date().toISOString(),
    candidateScore: 92,
  };

  let sm: NavigationStateMachine;
  let baseTimestamp: number;

  beforeEach(() => {
    baseTimestamp = 1700000000000;
    sm = new NavigationStateMachine(mockRoute, {
      arrivalRadiusMeters: 20,
      maxGpsAccuracyMeters: 30,
      confirmationDwellMs: 2000,
      maxWalkingSpeedMps: 6.0,
      deviationThresholdMeters: 100,
    });
  });

  it('initializes in READY state and selects first target waypoint on start', () => {
    expect(sm.getSnapshot().state).toBe('READY');
    expect(sm.getSnapshot().currentWaypointIndex).toBe(0);

    sm.start();

    expect(sm.getSnapshot().state).toBe('NAVIGATING');
    // Start node is index 0, so target advances to index 1 (St James Park)
    expect(sm.getSnapshot().currentWaypointIndex).toBe(1);
    expect(sm.getCurrentWaypoint().name).toBe('St James Park');
  });

  it('handles normal arrival progression with dwell confirmation window', () => {
    sm.start();

    // 1. User is en route, 150m away from WP 1
    const enRouteGps: GPSReading = {
      latitude: 51.5060,
      longitude: -0.1300,
      accuracy: 8,
      timestamp: baseTimestamp,
    };
    sm.processGpsUpdate(enRouteGps);
    expect(sm.getSnapshot().state).toBe('NAVIGATING');

    // 2. User enters arrival radius (walking 240m over 60s = 4 m/s)
    const arrivalGps1: GPSReading = {
      latitude: mockWp1.latitude,
      longitude: mockWp1.longitude,
      accuracy: 6,
      timestamp: baseTimestamp + 60000,
    };
    sm.processGpsUpdate(arrivalGps1);
    expect(sm.getSnapshot().state).toBe('ARRIVAL_PENDING');

    // 3. User dwells within arrival radius for full confirmation window (>= 2000ms)
    const arrivalGps2: GPSReading = {
      latitude: mockWp1.latitude,
      longitude: mockWp1.longitude,
      accuracy: 5,
      timestamp: baseTimestamp + 62500,
    };
    sm.processGpsUpdate(arrivalGps2);

    // Advanced to next waypoint exactly once!
    expect(sm.getSnapshot().state).toBe('NAVIGATING');
    expect(sm.getSnapshot().currentWaypointIndex).toBe(2);
    expect(sm.getCurrentWaypoint().name).toBe('Victoria Memorial');
  });

  it('does not advance waypoint when user is outside arrival radius', () => {
    sm.start();

    // User is on route, but 150m away from target
    const enRouteGps: GPSReading = {
      latitude: 51.5060,
      longitude: -0.1300,
      accuracy: 8,
      timestamp: baseTimestamp,
    };
    sm.processGpsUpdate(enRouteGps);

    expect(sm.getSnapshot().state).toBe('NAVIGATING');
    expect(sm.getSnapshot().currentWaypointIndex).toBe(1);
  });

  it('rejects poor GPS accuracy and prevents premature arrival triggers', () => {
    sm.start();

    // Coordinates match waypoint exactly, but accuracy is ±45m (poor/noisy)
    const poorAccuracyGps: GPSReading = {
      latitude: mockWp1.latitude,
      longitude: mockWp1.longitude,
      accuracy: 45, // > max tolerance 30m
      timestamp: baseTimestamp,
    };
    sm.processGpsUpdate(poorAccuracyGps);

    // Should NOT transition to ARRIVAL_PENDING due to accuracy filter
    expect(sm.getSnapshot().state).toBe('NAVIGATING');
    expect(sm.getSnapshot().currentWaypointIndex).toBe(1);
  });

  it('discards duplicate and out-of-order timestamps', () => {
    sm.start();

    const reading1: GPSReading = {
      latitude: 51.5060,
      longitude: -0.1300,
      accuracy: 8,
      timestamp: baseTimestamp + 5000,
    };
    sm.processGpsUpdate(reading1);
    expect(sm.getSnapshot().lastValidGps?.timestamp).toBe(baseTimestamp + 5000);

    // Out-of-order reading (timestamp in the past)
    const outOfOrder: GPSReading = {
      latitude: mockWp1.latitude,
      longitude: mockWp1.longitude,
      accuracy: 5,
      timestamp: baseTimestamp + 2000, // < 5000
    };
    sm.processGpsUpdate(outOfOrder);

    // Ignored
    expect(sm.getSnapshot().lastValidGps?.timestamp).toBe(baseTimestamp + 5000);
    expect(sm.getSnapshot().state).toBe('NAVIGATING');
  });

  it('supports pause, resume, and cancellation flows', () => {
    sm.start();
    expect(sm.getSnapshot().state).toBe('NAVIGATING');

    sm.pause();
    expect(sm.getSnapshot().state).toBe('PAUSED');

    // GPS updates while paused must be ignored
    sm.processGpsUpdate({
      latitude: mockWp1.latitude,
      longitude: mockWp1.longitude,
      accuracy: 5,
      timestamp: baseTimestamp + 1000,
    });
    expect(sm.getSnapshot().state).toBe('PAUSED');

    sm.resume();
    expect(sm.getSnapshot().state).toBe('NAVIGATING');

    sm.cancel();
    expect(sm.getSnapshot().state).toBe('CANCELLED');
  });

  it('handles GPS loss and recovery', () => {
    sm.start();

    sm.reportLocationError('GPS hardware unavailable in tunnel');
    expect(sm.getSnapshot().state).toBe('LOCATION_UNAVAILABLE');
    expect(sm.getSnapshot().errorMessage).toBe('GPS hardware unavailable in tunnel');

    sm.recoverLocation();
    expect(sm.getSnapshot().state).toBe('NAVIGATING');
    expect(sm.getSnapshot().errorMessage).toBeNull();
  });

  it('supports manual arrival confirmation without GPS lock', () => {
    sm.start();
    expect(sm.getSnapshot().currentWaypointIndex).toBe(1);

    sm.manualConfirmArrival();
    expect(sm.getSnapshot().currentWaypointIndex).toBe(2);
    expect(sm.getCurrentWaypoint().name).toBe('Victoria Memorial');

    // Final waypoint manual confirm completes mission
    sm.manualConfirmArrival();
    expect(sm.getSnapshot().state).toBe('COMPLETED');
  });

  it('detects route deviation and enters REROUTING state', () => {
    sm.start();

    // User is on route initially
    const onRouteGps1: GPSReading = {
      latitude: 51.5060,
      longitude: -0.1300,
      accuracy: 8,
      timestamp: baseTimestamp,
    };
    sm.processGpsUpdate(onRouteGps1);
    expect(sm.getSnapshot().state).toBe('NAVIGATING');

    // User walks 660m away from the active leg geometry over 200s (3.3 m/s)
    const offRouteGps: GPSReading = {
      latitude: 51.5120,
      longitude: -0.1300,
      accuracy: 8,
      timestamp: baseTimestamp + 200000,
    };
    sm.processGpsUpdate(offRouteGps);

    expect(sm.getSnapshot().state).toBe('REROUTING');
    expect(sm.getSnapshot().isOffRoute).toBe(true);

    // User walks back onto active route over 200s (3.3 m/s)
    const onRouteGps2: GPSReading = {
      latitude: 51.5060,
      longitude: -0.1300,
      accuracy: 8,
      timestamp: baseTimestamp + 400000,
    };
    sm.processGpsUpdate(onRouteGps2);

    expect(sm.getSnapshot().state).toBe('NAVIGATING');
    expect(sm.getSnapshot().isOffRoute).toBe(false);
  });

  it('completes the mission when the final destination waypoint is reached', () => {
    sm.start();

    // Reach WP 1 manually
    sm.manualConfirmArrival();
    expect(sm.getSnapshot().currentWaypointIndex).toBe(2); // Final WP

    // Dwell at final WP
    const arrivalFinal1: GPSReading = {
      latitude: mockWp2.latitude,
      longitude: mockWp2.longitude,
      accuracy: 5,
      timestamp: baseTimestamp,
    };
    sm.processGpsUpdate(arrivalFinal1);
    expect(sm.getSnapshot().state).toBe('ARRIVAL_PENDING');

    const arrivalFinal2: GPSReading = {
      latitude: mockWp2.latitude,
      longitude: mockWp2.longitude,
      accuracy: 5,
      timestamp: baseTimestamp + 3000,
    };
    sm.processGpsUpdate(arrivalFinal2);

    expect(sm.getSnapshot().state).toBe('COMPLETED');
  });

  it('serializes and restores mission state accurately for page reload resilience', () => {
    sm.start();
    sm.manualConfirmArrival(); // At index 2

    const serialized = sm.serialize();
    const restored = NavigationStateMachine.restore(serialized);

    expect(restored.getSnapshot().state).toBe('NAVIGATING');
    expect(restored.getSnapshot().currentWaypointIndex).toBe(2);
    expect(restored.getCurrentWaypoint().name).toBe('Victoria Memorial');
  });
});
