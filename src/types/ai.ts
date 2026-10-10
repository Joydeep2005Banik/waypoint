import { ExplorationStyle } from './geo';

export interface WaypointEnrichment {
  waypointId: string;
  instruction: string;
  observationPrompt: string;
  historicalContext?: string;
}

export interface MissionEnrichmentParams {
  explorationStyle: ExplorationStyle;
  targetDurationMinutes: number;
  totalDistanceMeters: number;
  isLoop: boolean;
  startLocationName: string;
  waypoints: {
    id: string;
    name: string;
    category: string;
    order: number;
    tags?: Record<string, string>;
  }[];
}

export interface MissionEnrichmentResult {
  title: string;
  theme: string;
  summary: string;
  waypoints: WaypointEnrichment[];
  provider: 'ollama' | 'deterministic';
  modelUsed?: string;
  latencyMs?: number;
}

export interface AIProviderHealth {
  isAvailable: boolean;
  provider: 'ollama' | 'deterministic';
  model: string;
  details?: string;
  error?: string;
}

export interface IAIProvider {
  enrichMission(params: MissionEnrichmentParams): Promise<MissionEnrichmentResult>;
  healthCheck(): Promise<AIProviderHealth>;
}
