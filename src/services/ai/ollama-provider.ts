import {
  IAIProvider,
  MissionEnrichmentParams,
  MissionEnrichmentResult,
  AIProviderHealth,
  WaypointEnrichment,
} from '@/types/ai';

export class OllamaAIProvider implements IAIProvider {
  private baseUrl: string;
  private model: string;
  private timeoutMs: number;

  constructor(
    baseUrl: string = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434',
    model: string = process.env.OLLAMA_MODEL || 'qwen2.5:1.5b',
    timeoutMs: number = 12000
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.model = model;
    this.timeoutMs = timeoutMs;
  }

  async healthCheck(): Promise<AIProviderHealth> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const res = await fetch(`${this.baseUrl}/api/tags`, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        return {
          isAvailable: false,
          provider: 'ollama',
          model: this.model,
          error: `Ollama daemon returned HTTP ${res.status}`,
        };
      }

      const data = await res.json();
      const models = Array.isArray(data.models) ? data.models.map((m: { name?: string }) => m.name || '') : [];
      const hasModel = models.some((m: string) => m.toLowerCase().includes(this.model.toLowerCase().split(':')[0]));

      return {
        isAvailable: true,
        provider: 'ollama',
        model: this.model,
        details: hasModel
          ? `Ollama online with model '${this.model}' loaded.`
          : `Ollama online, but model '${this.model}' may need to be pulled ('ollama pull ${this.model}').`,
      };
    } catch (err: unknown) {
      return {
        isAvailable: false,
        provider: 'ollama',
        model: this.model,
        error: err instanceof Error ? err.message : 'Cannot reach local Ollama daemon at ' + this.baseUrl,
      };
    }
  }

  async enrichMission(params: MissionEnrichmentParams): Promise<MissionEnrichmentResult> {
    const startTime = Date.now();
    const validIds = new Set(params.waypoints.map((w) => w.id));

    const systemPrompt = `
You are the AI mission briefing assistant for Waypoint Autopilot, an outdoor pedestrian navigation app.
Your task is to enrich an already-validated pedestrian route with a brief theme, concise waypoint instructions, and glanceable observation prompts.

STRICT CONSTRAINTS:
1. You MUST NOT invent coordinates, street paths, landmarks, or new waypoints.
2. You MUST strictly use the supplied waypoint IDs. Every waypoint in your response must have a 'waypointId' matching one of the provided IDs exactly.
3. Keep all waypoint instructions under 20 words for quick outdoor glanceability.
4. Provide an 'observationPrompt' for each waypoint prompting the walker to look up at real-world details (architecture, nature, plaques).
5. Output MUST be valid JSON conforming strictly to the requested schema.
`.trim();

    const userPrompt = `
Generate a mission enrichment for the following pedestrian route:
- Exploration Style: ${params.explorationStyle}
- Target Duration: ${params.targetDurationMinutes} minutes
- Total Distance: ${(params.totalDistanceMeters / 1000).toFixed(2)} km
- Circuit Type: ${params.isLoop ? 'Loop' : 'Point-to-Point'}
- Starting Location: ${params.startLocationName}

Supplied Waypoints (Ordered):
${JSON.stringify(
  params.waypoints.map((w) => ({
    id: w.id,
    order: w.order,
    name: w.name,
    category: w.category,
    tags: w.tags,
  })),
  null,
  2
)}

JSON Schema required:
{
  "title": "Short compelling mission title (string)",
  "theme": "Thematic subtitle for this walk (string)",
  "summary": "1-2 sentence description explaining why this route fits the style (string)",
  "waypoints": [
    {
      "waypointId": "MUST match supplied waypoint ID exactly (string)",
      "instruction": "Glanceable walking instruction < 20 words (string)",
      "observationPrompt": "Visual / architectural observation cue (string)"
    }
  ]
}
`.trim();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          format: 'json',
          stream: false,
          options: {
            temperature: 0.3,
            num_predict: 800,
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Ollama inference request failed with status HTTP ${response.status}`);
      }

      const responseData = await response.json();
      const content = responseData.message?.content || responseData.response;

      if (!content || typeof content !== 'string') {
        throw new Error('Ollama returned an empty response body.');
      }

      // Parse JSON from model output
      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(content);
      } catch {
        throw new Error('Ollama response could not be parsed as valid JSON.');
      }

      // Strict Schema Validation
      if (
        typeof parsed.title !== 'string' ||
        typeof parsed.theme !== 'string' ||
        typeof parsed.summary !== 'string' ||
        !Array.isArray(parsed.waypoints)
      ) {
        throw new Error('Ollama JSON output is missing required top-level schema fields.');
      }

      // Validate Waypoint IDs and structure
      const validatedWaypoints: WaypointEnrichment[] = [];
      const returnedIds = new Set<string>();

      for (const item of parsed.waypoints as Record<string, unknown>[]) {
        const wpId = String(item.waypointId || '');
        if (!validIds.has(wpId)) {
          throw new Error(`Model hallucinated an unknown waypointId: "${wpId}".`);
        }

        if (returnedIds.has(wpId)) {
          continue; // skip duplicate waypoint entries
        }
        returnedIds.add(wpId);

        const instruction = this.sanitizeText(String(item.instruction || ''), 25, 'Walk towards destination.');
        const observationPrompt = this.sanitizeText(
          String(item.observationPrompt || ''),
          35,
          'Observe your immediate surroundings.'
        );

        validatedWaypoints.push({
          waypointId: wpId,
          instruction,
          observationPrompt,
        });
      }

      // Ensure every input waypoint has an enrichment entry
      for (const wp of params.waypoints) {
        if (!returnedIds.has(wp.id)) {
          validatedWaypoints.push({
            waypointId: wp.id,
            instruction: `Walk towards ${wp.name}.`,
            observationPrompt: `Notice the features around ${wp.name}.`,
          });
        }
      }

      // Sort in matching order
      validatedWaypoints.sort((a, b) => {
        const orderA = params.waypoints.find((w) => w.id === a.waypointId)?.order || 0;
        const orderB = params.waypoints.find((w) => w.id === b.waypointId)?.order || 0;
        return orderA - orderB;
      });

      return {
        title: this.sanitizeText(parsed.title, 12, 'Curated Waypoint Walk'),
        theme: this.sanitizeText(parsed.theme, 15, 'Pedestrian Exploration'),
        summary: this.sanitizeText(parsed.summary, 60, 'An autonomous pedestrian walking mission.'),
        waypoints: validatedWaypoints,
        provider: 'ollama',
        modelUsed: this.model,
        latencyMs: Date.now() - startTime,
      };
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error(`Ollama model inference timed out after ${this.timeoutMs / 1000} seconds.`);
      }
      throw err;
    }
  }

  private sanitizeText(input: string, maxWords: number, fallback: string): string {
    const trimmed = input.trim();
    if (!trimmed) return fallback;
    const words = trimmed.split(/\s+/);
    if (words.length > maxWords) {
      return words.slice(0, maxWords).join(' ') + '...';
    }
    return trimmed;
  }
}
