import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { PreparedRoute } from '@/types/geo';

interface WaypointDB extends DBSchema {
  missions: {
    key: string;
    value: PreparedRoute;
  };
  activeState: {
    key: string;
    value: string;
  };
}

const DB_NAME = 'waypoint-db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<WaypointDB>> | null = null;

function getDB() {
  if (typeof window === 'undefined') return null;
  
  if (!dbPromise) {
    dbPromise = openDB<WaypointDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('missions')) {
          db.createObjectStore('missions', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('activeState')) {
          db.createObjectStore('activeState');
        }
      },
    });
  }
  return dbPromise;
}

export const IdbStorage = {
  async saveMission(route: PreparedRoute): Promise<void> {
    const db = await getDB();
    if (!db) return;
    await db.put('missions', route);
  },

  async getMission(id: string): Promise<PreparedRoute | undefined> {
    const db = await getDB();
    if (!db) return undefined;
    return await db.get('missions', id);
  },

  async getAllMissions(): Promise<PreparedRoute[]> {
    const db = await getDB();
    if (!db) return [];
    return await db.getAll('missions');
  },

  async deleteMission(id: string): Promise<void> {
    const db = await getDB();
    if (!db) return;
    await db.delete('missions', id);
  },

  async clearAllMissions(): Promise<void> {
    const db = await getDB();
    if (!db) return;
    await db.clear('missions');
  },

  async saveActiveState(serializedState: string): Promise<void> {
    const db = await getDB();
    if (!db) return;
    await db.put('activeState', serializedState, 'current');
  },

  async getActiveState(): Promise<string | undefined> {
    const db = await getDB();
    if (!db) return undefined;
    return await db.get('activeState', 'current');
  },

  async clearActiveState(): Promise<void> {
    const db = await getDB();
    if (!db) return;
    await db.delete('activeState', 'current');
  },
};
