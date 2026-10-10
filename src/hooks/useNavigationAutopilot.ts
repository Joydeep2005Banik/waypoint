'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { NavigationStateMachine } from '@/services/navigation/navigation-state-machine';
import {
  NavigationSnapshot,
  NavigationConfig,
  GPSReading,
} from '@/types/navigation';
import { PreparedRoute } from '@/types/geo';

const ACTIVE_MISSION_STORAGE_KEY = 'waypoint_active_mission_snapshot';

export function useNavigationAutopilot(
  route: PreparedRoute | null,
  config?: Partial<NavigationConfig>
) {
  const smRef = useRef<NavigationStateMachine | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const configRef = useRef(config);
  const [snapshot, setSnapshot] = useState<NavigationSnapshot | null>(null);

  useEffect(() => {
    configRef.current = config;
  }, [config]);

  // Initialize or restore state machine
  useEffect(() => {
    // 1. Check for stored mission if no explicit route was passed
    if (!route) {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(ACTIVE_MISSION_STORAGE_KEY);
        if (stored) {
          try {
            const restored = NavigationStateMachine.restore(stored);
            if (
              restored.getSnapshot().state !== 'COMPLETED' &&
              restored.getSnapshot().state !== 'CANCELLED'
            ) {
              smRef.current = restored;
              const unsubscribe = restored.subscribe((snap) => setSnapshot(snap));
              return () => unsubscribe();
            }
          } catch {
            localStorage.removeItem(ACTIVE_MISSION_STORAGE_KEY);
          }
        }
      }
      return;
    }

    // 2. Initialize fresh state machine with provided route
    const sm = new NavigationStateMachine(route, configRef.current);
    smRef.current = sm;

    const unsubscribe = sm.subscribe((snap) => {
      setSnapshot(snap);
      // Persist active snapshot
      if (typeof window !== 'undefined') {
        if (snap.state !== 'COMPLETED' && snap.state !== 'CANCELLED') {
          localStorage.setItem(ACTIVE_MISSION_STORAGE_KEY, sm.serialize());
        } else {
          localStorage.removeItem(ACTIVE_MISSION_STORAGE_KEY);
        }
      }
    });

    return () => {
      unsubscribe();
      if (watchIdRef.current !== null && typeof navigator !== 'undefined') {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [route]);

  const currentState = snapshot?.state;

  // Hook up Geolocation watcher based on state
  useEffect(() => {
    const sm = smRef.current;
    if (!sm) return;

    const isActiveState =
      currentState === 'NAVIGATING' ||
      currentState === 'ARRIVAL_PENDING' ||
      currentState === 'REROUTING';

    if (
      isActiveState &&
      watchIdRef.current === null &&
      typeof navigator !== 'undefined' &&
      navigator.geolocation
    ) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const reading: GPSReading = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp || Date.now(),
            speed: position.coords.speed,
            heading: position.coords.heading,
          };
          sm.processGpsUpdate(reading);
        },
        (error) => {
          let errorMsg = 'GPS location unavailable.';
          if (error.code === error.PERMISSION_DENIED) {
            errorMsg = 'Location permission denied by browser.';
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            errorMsg = 'GPS position currently unavailable.';
          } else if (error.code === error.TIMEOUT) {
            errorMsg = 'GPS reading timed out.';
          }
          sm.reportLocationError(errorMsg);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 2000,
        }
      );

      watchIdRef.current = watchId;
    } else if (!isActiveState && watchIdRef.current !== null && typeof navigator !== 'undefined') {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, [currentState]);

  // Actions
  const start = useCallback(() => {
    smRef.current?.start();
  }, []);

  const pause = useCallback(() => {
    smRef.current?.pause();
  }, []);

  const resume = useCallback(() => {
    smRef.current?.resume();
  }, []);

  const cancel = useCallback(() => {
    smRef.current?.cancel();
    if (typeof window !== 'undefined') {
      localStorage.removeItem(ACTIVE_MISSION_STORAGE_KEY);
    }
  }, []);

  const manualConfirmArrival = useCallback(() => {
    smRef.current?.manualConfirmArrival();
  }, []);

  const recoverLocation = useCallback(() => {
    smRef.current?.recoverLocation();
  }, []);

  const simulateGps = useCallback((reading: GPSReading) => {
    smRef.current?.processGpsUpdate(reading);
  }, []);

  const resetMission = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(ACTIVE_MISSION_STORAGE_KEY);
    }
    setSnapshot(null);
    smRef.current = null;
  }, []);

  return {
    snapshot,
    stateMachine: smRef.current,
    start,
    pause,
    resume,
    cancel,
    manualConfirmArrival,
    recoverLocation,
    simulateGps,
    resetMission,
  };
}
