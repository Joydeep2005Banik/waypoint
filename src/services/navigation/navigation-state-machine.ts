import {
  NavigationState,
  GpsAccuracyLevel,
  GPSReading,
  NavigationConfig,
  NavigationSnapshot,
} from '@/types/navigation';
import { PreparedRoute, Waypoint, GeoCoordinates } from '@/types/geo';
import { haversineDistance, isValidCoordinate } from '@/lib/geo';
import { distanceToPolyline } from '@/lib/geo-track';

export const DEFAULT_NAVIGATION_CONFIG: NavigationConfig = {
  arrivalRadiusMeters: 20,
  maxGpsAccuracyMeters: 30,
  confirmationDwellMs: 2000,
  maxWalkingSpeedMps: 6.0, // 21.6 km/h (filters teleport jumps)
  deviationThresholdMeters: 120,
};

export class NavigationStateMachine {
  private route: PreparedRoute;
  private config: NavigationConfig;
  private state: NavigationState = 'READY';
  private currentWaypointIndex: number = 0;
  private visitedWaypointIds: Set<string> = new Set();
  private lastValidGps: GPSReading | null = null;
  private arrivalStartTime: number | null = null;
  private totalDistanceWalkedMeters: number = 0;
  private startTime: number | null = null;
  private pausedTimeAccumulatorMs: number = 0;
  private pauseStartTime: number | null = null;
  private statusMessage: string = 'Ready to begin exploration mission.';
  private errorMessage: string | null = null;
  private listeners: Set<(snapshot: NavigationSnapshot) => void> = new Set();

  constructor(route: PreparedRoute, config: Partial<NavigationConfig> = {}) {
    if (!route || !route.waypoints || route.waypoints.length === 0) {
      throw new Error('NavigationStateMachine requires a valid PreparedRoute with waypoints.');
    }
    this.route = route;
    this.config = { ...DEFAULT_NAVIGATION_CONFIG, ...config };
    this.currentWaypointIndex = 0;
  }

  // --- Public Action Methods ---

  public start(): void {
    if (this.state !== 'READY' && this.state !== 'PAUSED') {
      return;
    }

    this.state = 'NAVIGATING';
    this.startTime = Date.now();
    this.errorMessage = null;

    // If starting at WP 0 (start anchor), target WP 1 if user is already at start
    if (this.currentWaypointIndex === 0 && this.route.waypoints.length > 1) {
      // Keep at 0 or 1 based on start node
      const firstWp = this.route.waypoints[0];
      if (firstWp.isStart && this.route.waypoints.length > 1) {
        // We target waypoint 1 as the first destination, or 0 if start itself is an initial target
        this.currentWaypointIndex = 1;
        this.visitedWaypointIds.add(firstWp.id);
      }
    }

    this.statusMessage = `Navigating towards ${this.getCurrentWaypoint().name}.`;
    this.notify();
  }

  public pause(): void {
    if (
      this.state === 'NAVIGATING' ||
      this.state === 'ARRIVAL_PENDING' ||
      this.state === 'REROUTING' ||
      this.state === 'LOCATION_UNAVAILABLE'
    ) {
      this.state = 'PAUSED';
      this.pauseStartTime = Date.now();
      this.statusMessage = 'Navigation paused.';
      this.notify();
    }
  }

  public resume(): void {
    if (this.state === 'PAUSED') {
      if (this.pauseStartTime) {
        this.pausedTimeAccumulatorMs += Date.now() - this.pauseStartTime;
        this.pauseStartTime = null;
      }
      this.state = 'NAVIGATING';
      this.statusMessage = `Resumed navigation towards ${this.getCurrentWaypoint().name}.`;
      this.notify();
    }
  }

  public cancel(): void {
    if (this.state !== 'COMPLETED') {
      this.state = 'CANCELLED';
      this.statusMessage = 'Mission cancelled by user.';
      this.notify();
    }
  }

  public manualConfirmArrival(): void {
    if (this.state === 'COMPLETED' || this.state === 'CANCELLED') {
      return;
    }

    const currentWp = this.getCurrentWaypoint();
    this.visitedWaypointIds.add(currentWp.id);

    // If this was the last waypoint, complete
    if (this.currentWaypointIndex >= this.route.waypoints.length - 1) {
      this.state = 'COMPLETED';
      this.statusMessage = 'Mission successfully completed! All waypoints reached.';
      this.notify();
      return;
    }

    // Advance to next waypoint
    this.currentWaypointIndex += 1;
    this.arrivalStartTime = null;
    this.state = 'NAVIGATING';
    this.statusMessage = `Manual confirmation: now heading towards ${this.getCurrentWaypoint().name}.`;
    this.notify();
  }

  public reportLocationError(errorMsg: string): void {
    if (
      this.state === 'NAVIGATING' ||
      this.state === 'ARRIVAL_PENDING' ||
      this.state === 'REROUTING'
    ) {
      this.state = 'LOCATION_UNAVAILABLE';
      this.errorMessage = errorMsg;
      this.statusMessage = 'GPS signal lost or unavailable. You can pause, confirm manually, or retry.';
      this.notify();
    }
  }

  public recoverLocation(): void {
    if (this.state === 'LOCATION_UNAVAILABLE') {
      this.state = 'NAVIGATING';
      this.errorMessage = null;
      this.statusMessage = `GPS signal restored. Heading to ${this.getCurrentWaypoint().name}.`;
      this.notify();
    }
  }

  public rerouteWithNewRoute(newRoute: PreparedRoute): void {
    this.route = newRoute;
    this.currentWaypointIndex = 0;
    this.visitedWaypointIds.clear();
    this.arrivalStartTime = null;
    this.state = 'NAVIGATING';
    this.errorMessage = null;
    this.statusMessage = `Rerouted. Now heading towards ${this.getCurrentWaypoint().name}.`;
    this.notify();
  }

  // --- GPS Processing Core ---

  public processGpsUpdate(reading: GPSReading): void {
    // 1. Process only while actively navigating
    if (
      this.state !== 'NAVIGATING' &&
      this.state !== 'ARRIVAL_PENDING' &&
      this.state !== 'REROUTING'
    ) {
      return;
    }

    // 2. Validate coordinates
    if (!isValidCoordinate(reading)) {
      return;
    }

    // 3. Discard duplicate or out-of-order timestamps
    if (this.lastValidGps && reading.timestamp <= this.lastValidGps.timestamp) {
      return;
    }

    // 4. Check accuracy tolerance
    if (reading.accuracy > this.config.maxGpsAccuracyMeters) {
      // Noisy reading - do not advance waypoint on poor accuracy
      this.notify();
      return;
    }

    // 5. Check speed / teleportation spike filter
    if (this.lastValidGps) {
      const dtSeconds = (reading.timestamp - this.lastValidGps.timestamp) / 1000;
      if (dtSeconds > 0) {
        const stepDist = haversineDistance(this.lastValidGps, reading);
        const calculatedSpeed = stepDist / dtSeconds;
        if (calculatedSpeed > this.config.maxWalkingSpeedMps) {
          // Unrealistic speed spike (e.g. cellular tower jump) - discard
          return;
        }
        this.totalDistanceWalkedMeters += stepDist;
      }
    }

    this.lastValidGps = reading;

    // 6. Check Distance to Current Target Waypoint
    const currentWp = this.getCurrentWaypoint();
    const distToTarget = haversineDistance(reading, currentWp.coordinates);
    const effectiveArrivalRadius = Math.max(
      this.config.arrivalRadiusMeters,
      currentWp.arrivalRadiusMeters || this.config.arrivalRadiusMeters
    );

    // 7. Check Route Deviation
    const distToRoute = this.calculateDistanceToActiveLeg(reading);
    const isOffRoute = distToRoute > this.config.deviationThresholdMeters;

    if (isOffRoute && this.state !== 'REROUTING' && this.state !== 'ARRIVAL_PENDING') {
      this.state = 'REROUTING';
      this.statusMessage = `Route deviation detected (${Math.round(distToRoute)}m off-path). Return towards the route or reroute.`;
    } else if (!isOffRoute && this.state === 'REROUTING') {
      this.state = 'NAVIGATING';
      this.statusMessage = `Back on track. Heading towards ${currentWp.name}.`;
    }

    // 8. Arrival Detection & Dwell State Machine
    if (distToTarget <= effectiveArrivalRadius) {
      if (this.state === 'NAVIGATING' || this.state === 'REROUTING') {
        this.state = 'ARRIVAL_PENDING';
        this.arrivalStartTime = reading.timestamp;
        this.statusMessage = `Approaching ${currentWp.name}. Confirming arrival...`;
      } else if (this.state === 'ARRIVAL_PENDING' && this.arrivalStartTime !== null) {
        const dwellElapsed = reading.timestamp - this.arrivalStartTime;
        if (dwellElapsed >= this.config.confirmationDwellMs) {
          // Dwell satisfied -> WAYPOINT_REACHED -> Advance
          this.handleWaypointArrival(currentWp);
        }
      }
    } else {
      // User moved outside arrival radius while arrival was pending
      if (this.state === 'ARRIVAL_PENDING') {
        this.state = isOffRoute ? 'REROUTING' : 'NAVIGATING';
        this.arrivalStartTime = null;
        this.statusMessage = `Heading towards ${currentWp.name} (${Math.round(distToTarget)}m away).`;
      }
    }

    this.notify();
  }

  private handleWaypointArrival(currentWp: Waypoint): void {
    this.visitedWaypointIds.add(currentWp.id);
    this.arrivalStartTime = null;

    // Check if this was the final waypoint
    if (this.currentWaypointIndex >= this.route.waypoints.length - 1) {
      this.state = 'COMPLETED';
      this.statusMessage = `Mission complete! You have arrived at the final destination: ${currentWp.name}.`;
    } else {
      // Advance exactly once to next waypoint
      this.currentWaypointIndex += 1;
      const nextWp = this.getCurrentWaypoint();
      this.state = 'NAVIGATING';
      this.statusMessage = `Arrived at ${currentWp.name}! Next waypoint: ${nextWp.name}.`;
    }
  }

  private calculateDistanceToActiveLeg(userCoords: GeoCoordinates): number {
    if (!this.route.legs || this.route.legs.length === 0) {
      return 0;
    }

    // When targeting waypoint k (where k >= 1), the active leg is leg k - 1
    const legIndex = Math.max(
      0,
      Math.min(this.currentWaypointIndex - 1, this.route.legs.length - 1)
    );
    const activeLeg = this.route.legs[legIndex];

    if (activeLeg && activeLeg.geometry && activeLeg.geometry.length > 0) {
      return distanceToPolyline(userCoords, activeLeg.geometry);
    }

    // Fallback: check all legs
    let minD = Infinity;
    for (const leg of this.route.legs) {
      if (leg.geometry && leg.geometry.length > 0) {
        const d = distanceToPolyline(userCoords, leg.geometry);
        if (d < minD) minD = d;
      }
    }
    return minD === Infinity ? 0 : minD;
  }

  // --- Snapshot & Getters ---

  public getCurrentWaypoint(): Waypoint {
    const idx = Math.min(this.currentWaypointIndex, this.route.waypoints.length - 1);
    return this.route.waypoints[idx];
  }

  public getNextWaypoint(): Waypoint | null {
    if (this.currentWaypointIndex < this.route.waypoints.length - 1) {
      return this.route.waypoints[this.currentWaypointIndex + 1];
    }
    return null;
  }

  public getGpsAccuracyStatus(): GpsAccuracyLevel {
    if (!this.lastValidGps) return 'UNAVAILABLE';
    if (this.lastValidGps.accuracy <= 10) return 'GOOD';
    if (this.lastValidGps.accuracy <= 25) return 'MODERATE';
    return 'POOR';
  }

  public getSnapshot(): NavigationSnapshot {
    const currentWp = this.getCurrentWaypoint();
    const nextWp = this.getNextWaypoint();

    let distToCurrent = 0;
    let distToRoute = 0;

    if (this.lastValidGps) {
      distToCurrent = Math.round(haversineDistance(this.lastValidGps, currentWp.coordinates));
      distToRoute = Math.round(this.calculateDistanceToActiveLeg(this.lastValidGps));
    }

    let arrivalProgress = 0;
    if (this.state === 'ARRIVAL_PENDING' && this.arrivalStartTime && this.lastValidGps) {
      const elapsed = this.lastValidGps.timestamp - this.arrivalStartTime;
      arrivalProgress = Math.min(1.0, elapsed / this.config.confirmationDwellMs);
    } else if (this.state === 'WAYPOINT_REACHED' || this.state === 'COMPLETED') {
      arrivalProgress = 1.0;
    }

    let timeElapsed = 0;
    if (this.startTime) {
      const now = Date.now();
      const currentPause = this.pauseStartTime ? now - this.pauseStartTime : 0;
      timeElapsed = Math.max(
        0,
        Math.floor((now - this.startTime - this.pausedTimeAccumulatorMs - currentPause) / 1000)
      );
    }

    return {
      state: this.state,
      currentWaypointIndex: this.currentWaypointIndex,
      currentWaypoint: currentWp,
      nextWaypoint: nextWp,
      distanceToCurrentWaypointMeters: distToCurrent,
      distanceToRouteMeters: distToRoute,
      isOffRoute: distToRoute > this.config.deviationThresholdMeters,
      lastValidGps: this.lastValidGps,
      gpsAccuracyStatus: this.getGpsAccuracyStatus(),
      arrivalPendingProgress: arrivalProgress,
      timeElapsedSeconds: timeElapsed,
      totalDistanceWalkedMeters: Math.round(this.totalDistanceWalkedMeters),
      route: this.route,
      statusMessage: this.statusMessage,
      errorMessage: this.errorMessage,
      visitedWaypointIds: Array.from(this.visitedWaypointIds),
    };
  }

  // --- State Persistence & Restoration ---

  public serialize(): string {
    return JSON.stringify({
      route: this.route,
      state: this.state,
      currentWaypointIndex: this.currentWaypointIndex,
      visitedWaypointIds: Array.from(this.visitedWaypointIds),
      lastValidGps: this.lastValidGps,
      totalDistanceWalkedMeters: this.totalDistanceWalkedMeters,
      startTime: this.startTime,
      pausedTimeAccumulatorMs: this.pausedTimeAccumulatorMs,
      config: this.config,
    });
  }

  public static restore(serialized: string): NavigationStateMachine {
    const data = JSON.parse(serialized);
    const sm = new NavigationStateMachine(data.route, data.config);
    sm.state = data.state === 'ARRIVAL_PENDING' ? 'NAVIGATING' : data.state;
    sm.currentWaypointIndex = data.currentWaypointIndex;
    sm.visitedWaypointIds = new Set(data.visitedWaypointIds || []);
    sm.lastValidGps = data.lastValidGps;
    sm.totalDistanceWalkedMeters = data.totalDistanceWalkedMeters || 0;
    sm.startTime = data.startTime;
    sm.pausedTimeAccumulatorMs = data.pausedTimeAccumulatorMs || 0;
    return sm;
  }

  // --- Subscriptions ---

  public subscribe(listener: (snapshot: NavigationSnapshot) => void): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const snapshot = this.getSnapshot();
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }
}
