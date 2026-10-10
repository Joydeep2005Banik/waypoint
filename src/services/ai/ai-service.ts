import {
  IAIProvider,
  MissionEnrichmentParams,
  MissionEnrichmentResult,
  AIProviderHealth,
} from '@/types/ai';
import { OllamaAIProvider } from './ollama-provider';
import { DeterministicFallbackAIProvider } from './deterministic-provider';

export interface AIServiceConfig {
  providerPreference?: 'ollama' | 'deterministic';
  ollamaBaseUrl?: string;
  ollamaModel?: string;
}

export class AIProviderService implements IAIProvider {
  private ollamaProvider: OllamaAIProvider;
  private fallbackProvider: DeterministicFallbackAIProvider;
  private providerPreference: 'ollama' | 'deterministic';

  constructor(config: AIServiceConfig = {}) {
    this.providerPreference =
      config.providerPreference ||
      (process.env.NEXT_PUBLIC_AI_PROVIDER as 'ollama' | 'deterministic') ||
      'deterministic';

    this.ollamaProvider = new OllamaAIProvider(
      config.ollamaBaseUrl || process.env.OLLAMA_BASE_URL,
      config.ollamaModel || process.env.OLLAMA_MODEL
    );

    this.fallbackProvider = new DeterministicFallbackAIProvider();
  }

  async healthCheck(): Promise<AIProviderHealth> {
    if (this.providerPreference === 'deterministic') {
      return this.fallbackProvider.healthCheck();
    }
    return this.ollamaProvider.healthCheck();
  }

  async enrichMission(params: MissionEnrichmentParams): Promise<MissionEnrichmentResult> {
    // 1. If deterministic provider is preferred, return immediately
    if (this.providerPreference === 'deterministic') {
      return this.fallbackProvider.enrichMission(params);
    }

    // 2. Try Ollama local inference
    try {
      return await this.ollamaProvider.enrichMission(params);
    } catch (ollamaError: unknown) {
      const errMsg =
        ollamaError instanceof Error ? ollamaError.message : String(ollamaError);

      console.warn(
        `[AIProviderService] Ollama inference failed (${errMsg}). Falling back to deterministic mission generation.`
      );

      // 3. Gracefully fall back to deterministic provider without failing route preparation
      const fallbackResult = await this.fallbackProvider.enrichMission(params);
      return {
        ...fallbackResult,
        summary: `${fallbackResult.summary} (Generated via deterministic offline engine: Ollama unavailable).`,
      };
    }
  }
}
