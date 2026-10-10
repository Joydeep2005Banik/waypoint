import { describe, it, expect, vi, afterEach } from 'vitest';
import { DeterministicFallbackAIProvider } from '@/services/ai/deterministic-provider';
import { OllamaAIProvider } from '@/services/ai/ollama-provider';
import { AIProviderService } from '@/services/ai/ai-service';
import { MissionEnrichmentParams } from '@/types/ai';

describe('AI Mission Generation Layer', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  const sampleParams: MissionEnrichmentParams = {
    explorationStyle: 'greenway',
    targetDurationMinutes: 35,
    totalDistanceMeters: 2800,
    isLoop: true,
    startLocationName: 'Trafalgar Square',
    waypoints: [
      {
        id: 'wp-start',
        name: 'Trafalgar Square',
        category: 'start',
        order: 1,
      },
      {
        id: 'wp-1',
        name: 'St James Park',
        category: 'park',
        order: 2,
        tags: { leisure: 'park', natural: 'wood' },
      },
      {
        id: 'wp-2',
        name: 'Victoria Memorial',
        category: 'monument',
        order: 3,
        tags: { historic: 'monument' },
      },
    ],
  };

  describe('DeterministicFallbackAIProvider', () => {
    const provider = new DeterministicFallbackAIProvider();

    it('generates rich, themed mission details without network calls', async () => {
      const result = await provider.enrichMission(sampleParams);

      expect(result.provider).toBe('deterministic');
      expect(result.title).toContain('Greenway');
      expect(result.theme).toContain('Parks');
      expect(result.summary).toContain('35-minute loop');
      expect(result.waypoints.length).toBe(3);

      // Verify all waypoint IDs match input
      expect(result.waypoints[0].waypointId).toBe('wp-start');
      expect(result.waypoints[1].waypointId).toBe('wp-1');
      expect(result.waypoints[2].waypointId).toBe('wp-2');

      // Observation prompts must exist
      expect(result.waypoints[1].observationPrompt).toBeDefined();
      expect(result.waypoints[1].observationPrompt.length).toBeGreaterThan(10);
    });

    it('adapts themes and observation cues across all exploration styles', async () => {
      const heritageResult = await provider.enrichMission({
        ...sampleParams,
        explorationStyle: 'heritage',
      });
      expect(heritageResult.title).toContain('Historic');

      const discoveryResult = await provider.enrichMission({
        ...sampleParams,
        explorationStyle: 'discovery',
      });
      expect(discoveryResult.title).toContain('Discovery');
    });
  });

  describe('OllamaAIProvider', () => {
    const provider = new OllamaAIProvider('http://127.0.0.1:11434', 'qwen2.5:1.5b');

    it('parses valid structured JSON output from Ollama', async () => {
      const mockOllamaResponse = {
        message: {
          content: JSON.stringify({
            title: 'Royal Parks & Monumental Walk',
            theme: 'Historic Green Corridors of Westminster',
            summary: 'An engaging 35-minute stroll visiting St James Park and royal monuments.',
            waypoints: [
              {
                waypointId: 'wp-start',
                instruction: 'Depart Trafalgar Square heading south towards the park.',
                observationPrompt: 'Observe the stone lions and historic fountains in the square.',
              },
              {
                waypointId: 'wp-1',
                instruction: 'Enter St James Park and follow the lake path.',
                observationPrompt: 'Notice the weeping willows and birdlife along the lake.',
              },
              {
                waypointId: 'wp-2',
                instruction: 'Arrive at Victoria Memorial gates.',
                observationPrompt: 'Look up at the gilded bronze figures and marble friezes.',
              },
            ],
          }),
        },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockOllamaResponse,
      });

      const result = await provider.enrichMission(sampleParams);

      expect(result.provider).toBe('ollama');
      expect(result.title).toBe('Royal Parks & Monumental Walk');
      expect(result.theme).toBe('Historic Green Corridors of Westminster');
      expect(result.waypoints.length).toBe(3);
      expect(result.waypoints[1].observationPrompt).toContain('weeping willows');
    });

    it('rejects hallucinated waypoint IDs and throws descriptive error', async () => {
      const mockHallucinatedResponse = {
        message: {
          content: JSON.stringify({
            title: 'Hallucinated Walk',
            theme: 'Theme',
            summary: 'Summary text',
            waypoints: [
              {
                waypointId: 'wp-invented-fake-id-999', // Unknown ID!
                instruction: 'Walk to nonexistent place.',
                observationPrompt: 'Observe nothing.',
              },
            ],
          }),
        },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockHallucinatedResponse,
      });

      await expect(provider.enrichMission(sampleParams)).rejects.toThrow(
        /Model hallucinated an unknown waypointId/
      );
    });

    it('rejects malformed non-JSON output', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          message: {
            content: 'Sure! Here is your route: Step 1, Step 2 (not JSON)',
          },
        }),
      });

      await expect(provider.enrichMission(sampleParams)).rejects.toThrow(
        /could not be parsed as valid JSON/
      );
    });

    it('handles daemon connection failures and health checks', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Connection refused'));

      const health = await provider.healthCheck();
      expect(health.isAvailable).toBe(false);
      expect(health.error).toContain('Connection refused');
    });
  });

  describe('AIProviderService (Graceful Fallback)', () => {
    it('automatically falls back to deterministic provider if Ollama is unreachable', async () => {
      // Simulate Ollama being down
      global.fetch = vi.fn().mockRejectedValue(new Error('Failed to fetch from 127.0.0.1:11434'));

      const service = new AIProviderService({ providerPreference: 'ollama' });
      const result = await service.enrichMission(sampleParams);

      // Must succeed via fallback without throwing!
      expect(result.provider).toBe('deterministic');
      expect(result.title).toBeDefined();
      expect(result.waypoints.length).toBe(3);
      expect(result.summary).toContain('deterministic offline engine');
    });
  });
});
