import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ActiveNavigationPanel } from '@/components/navigation/ActiveNavigationPanel';
import { NavigationSnapshot } from '@/types/navigation';
import { PreparedRoute } from '@/types/geo';

describe('ActiveNavigationPanel Component', () => {
  const mockRoute: PreparedRoute = {
    id: 'test-route',
    title: 'Historic Discovery Route',
    explorationStyle: 'heritage',
    startLocation: { name: 'City Center', coordinates: { latitude: 51.5, longitude: -0.1 } },
    targetDurationMinutes: 35,
    maxRadiusKm: 1.2,
    isLoop: true,
    waypoints: [
      {
        id: 'wp-0',
        order: 1,
        name: 'City Center Start',
        coordinates: { latitude: 51.5, longitude: -0.1 },
        arrivalRadiusMeters: 20,
        instruction: 'Start walking north',
        category: 'start',
        isStart: true,
      },
      {
        id: 'wp-1',
        order: 2,
        name: 'National Gallery',
        coordinates: { latitude: 51.508, longitude: -0.128 },
        arrivalRadiusMeters: 20,
        instruction: 'Proceed to gallery gates',
        category: 'museum',
      },
      {
        id: 'wp-2',
        order: 3,
        name: 'City Center Return',
        coordinates: { latitude: 51.5, longitude: -0.1 },
        arrivalRadiusMeters: 20,
        instruction: 'Complete your loop',
        category: 'end',
        isEnd: true,
      },
    ],
    legs: [],
    totalDistanceMeters: 2200,
    totalDurationMinutes: 28,
    boundingBox: { minLat: 51.49, minLng: -0.13, maxLat: 51.51, maxLng: -0.09 },
    createdAt: new Date().toISOString(),
    candidateScore: 88,
  };

  const baseSnapshot: NavigationSnapshot = {
    state: 'NAVIGATING',
    currentWaypointIndex: 1,
    currentWaypoint: mockRoute.waypoints[1],
    nextWaypoint: mockRoute.waypoints[2],
    distanceToCurrentWaypointMeters: 140,
    distanceToRouteMeters: 15,
    isOffRoute: false,
    lastValidGps: {
      latitude: 51.507,
      longitude: -0.127,
      accuracy: 6,
      timestamp: Date.now(),
    },
    gpsAccuracyStatus: 'GOOD',
    arrivalPendingProgress: 0,
    timeElapsedSeconds: 245,
    totalDistanceWalkedMeters: 450,
    route: mockRoute,
    statusMessage: 'Navigating to National Gallery',
    errorMessage: null,
    visitedWaypointIds: ['wp-0'],
  };

  it('renders target destination, distance, and glanceable instruction', () => {
    render(
      <ActiveNavigationPanel
        snapshot={baseSnapshot}
        onPause={vi.fn()}
        onResume={vi.fn()}
        onCancel={vi.fn()}
        onManualConfirm={vi.fn()}
        onRecoverLocation={vi.fn()}
        onReset={vi.fn()}
      />
    );

    expect(screen.getByText('National Gallery')).toBeInTheDocument();
    expect(screen.getByText('140 m')).toBeInTheDocument();
    expect(screen.getByText('Proceed to gallery gates')).toBeInTheDocument();
    expect(screen.getByText(/Next Up:/)).toBeInTheDocument();
    expect(screen.getByText('City Center Return')).toBeInTheDocument();
  });

  it('handles manual confirm arrival click', () => {
    const handleConfirm = vi.fn();
    render(
      <ActiveNavigationPanel
        snapshot={baseSnapshot}
        onPause={vi.fn()}
        onResume={vi.fn()}
        onCancel={vi.fn()}
        onManualConfirm={handleConfirm}
        onRecoverLocation={vi.fn()}
        onReset={vi.fn()}
      />
    );

    const confirmBtn = screen.getByRole('button', { name: /confirm waypoint arrival/i });
    fireEvent.click(confirmBtn);
    expect(handleConfirm).toHaveBeenCalledTimes(1);
  });

  it('renders off-route warning banner when state is REROUTING', () => {
    const offRouteSnapshot: NavigationSnapshot = {
      ...baseSnapshot,
      state: 'REROUTING',
      isOffRoute: true,
      distanceToRouteMeters: 160,
    };

    render(
      <ActiveNavigationPanel
        snapshot={offRouteSnapshot}
        onPause={vi.fn()}
        onResume={vi.fn()}
        onCancel={vi.fn()}
        onManualConfirm={vi.fn()}
        onRecoverLocation={vi.fn()}
        onReset={vi.fn()}
      />
    );

    expect(screen.getByText('Route Deviation Detected')).toBeInTheDocument();
    expect(screen.getByText(/160m off the designated pedestrian path/)).toBeInTheDocument();
  });

  it('renders completion screen when state is COMPLETED', () => {
    const completedSnapshot: NavigationSnapshot = {
      ...baseSnapshot,
      state: 'COMPLETED',
      totalDistanceWalkedMeters: 2200,
      timeElapsedSeconds: 1500,
    };

    render(
      <ActiveNavigationPanel
        snapshot={completedSnapshot}
        onPause={vi.fn()}
        onResume={vi.fn()}
        onCancel={vi.fn()}
        onManualConfirm={vi.fn()}
        onRecoverLocation={vi.fn()}
        onReset={vi.fn()}
      />
    );

    expect(screen.getByText('Mission Accomplished!')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /explore new mission/i })).toBeInTheDocument();
  });
});
