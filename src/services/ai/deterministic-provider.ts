import {
  IAIProvider,
  MissionEnrichmentParams,
  MissionEnrichmentResult,
  AIProviderHealth,
  WaypointEnrichment,
} from '@/types/ai';
import { ExplorationStyle } from '@/types/geo';

export class DeterministicFallbackAIProvider implements IAIProvider {
  async healthCheck(): Promise<AIProviderHealth> {
    return {
      isAvailable: true,
      provider: 'deterministic',
      model: 'deterministic-rules-engine',
      details: 'Deterministic rule-based enrichment engine (100% offline).',
    };
  }

  async enrichMission(params: MissionEnrichmentParams): Promise<MissionEnrichmentResult> {
    const startTime = Date.now();
    const { explorationStyle, isLoop, startLocationName, waypoints, targetDurationMinutes } = params;

    const theme = this.generateTheme(explorationStyle, waypoints);
    const title = this.generateTitle(explorationStyle, isLoop, startLocationName, waypoints);
    const summary = this.generateSummary(explorationStyle, isLoop, targetDurationMinutes, waypoints);

    const enrichedWaypoints: WaypointEnrichment[] = waypoints.map((wp, index) => {
      return {
        waypointId: wp.id,
        instruction: this.generateInstruction(wp, index, waypoints.length),
        observationPrompt: this.generateObservationPrompt(wp, explorationStyle),
        historicalContext: this.generateHistoricalContext(wp),
      };
    });

    return {
      title,
      theme,
      summary,
      waypoints: enrichedWaypoints,
      provider: 'deterministic',
      modelUsed: 'deterministic-template-v1',
      latencyMs: Date.now() - startTime,
    };
  }

  private generateTheme(
    style: ExplorationStyle,
    waypoints: MissionEnrichmentParams['waypoints']
  ): string {
    const categories = waypoints.map((w) => w.category.toLowerCase());
    const hasPark = categories.some((c) => c.includes('park') || c.includes('garden'));
    const hasHistoric = categories.some((c) => c.includes('monument') || c.includes('historic') || c.includes('museum'));
    const hasArt = categories.some((c) => c.includes('artwork') || c.includes('fountain') || c.includes('plaza'));

    switch (style) {
      case 'greenway':
        return hasHistoric
          ? 'Civic Parks & Heritage Canopies'
          : 'Urban Greenways & Public Garden Trails';
      case 'heritage':
        return hasPark
          ? 'Historic Landmarks & Parkland Memorials'
          : 'Architectural Heritage & Civic Monuments';
      case 'discovery':
        return hasArt
          ? 'Pedestrian Plazas, Public Art & Hidden Alleys'
          : 'Urban Discovery & Neighborhood Focal Points';
      case 'quiet':
      default:
        return 'Low-Traffic Corridors & Peaceful Living Streets';
    }
  }

  private generateTitle(
    style: ExplorationStyle,
    isLoop: boolean,
    startName: string,
    waypoints: MissionEnrichmentParams['waypoints']
  ): string {
    const landmarkNames = waypoints.filter((w) => w.name && !w.name.startsWith('Start')).map((w) => w.name);
    const primaryLandmark = landmarkNames[0] || 'Civic Corridor';
    const loopSuffix = isLoop ? 'Circuit' : 'Journey';

    switch (style) {
      case 'greenway':
        return `${primaryLandmark} Greenway ${loopSuffix}`;
      case 'heritage':
        return `${primaryLandmark} Historic ${loopSuffix}`;
      case 'discovery':
        return `${primaryLandmark} Discovery Walk`;
      case 'quiet':
      default:
        return `${primaryLandmark} Peaceful Waypoint ${loopSuffix}`;
    }
  }

  private generateSummary(
    style: ExplorationStyle,
    isLoop: boolean,
    durationMins: number,
    waypoints: MissionEnrichmentParams['waypoints']
  ): string {
    const count = waypoints.length;
    const styleDescriptions: Record<ExplorationStyle, string> = {
      greenway: 'prioritizes open green spaces, pedestrian tree-canopies, and public gardens',
      heritage: 'connects significant architectural monuments, civic squares, and historical landmarks',
      discovery: 'uncovers public artworks, vibrant community spaces, and walkable alleyways',
      quiet: 'follows tranquil residential streets, pedestrian footways, and low-stress pathways',
    };

    return `A ${durationMins}-minute ${isLoop ? 'loop' : 'point-to-point walk'} connecting ${count} validated pedestrian waypoints. This curated mission ${styleDescriptions[style]}, encouraging glanceable eyes-up exploration.`;
  }

  private generateInstruction(
    wp: MissionEnrichmentParams['waypoints'][0],
    index: number,
    total: number
  ): string {
    if (index === 0) {
      return `Depart from ${wp.name}. Proceed steadily along the pedestrian corridor.`;
    }
    if (index === total - 1) {
      return `Approach your final destination at ${wp.name} to conclude the mission.`;
    }
    return `Follow the pedestrian walkway towards ${wp.name} (${wp.category}).`;
  }

  private generateObservationPrompt(
    wp: MissionEnrichmentParams['waypoints'][0],
    style: ExplorationStyle
  ): string {
    const cat = wp.category.toLowerCase();
    if (cat.includes('park') || cat.includes('garden')) {
      return 'Observe the tree canopy, floral plantings, and open pathways around this green space.';
    }
    if (cat.includes('monument') || cat.includes('historic') || cat.includes('memorial')) {
      return 'Look for architectural masonry, historical plaques, and civic inscriptions.';
    }
    if (cat.includes('artwork') || cat.includes('fountain') || cat.includes('plaza')) {
      return 'Notice the public art detailing, surrounding plaza layout, and pedestrian atmosphere.';
    }
    return 'Take in the surrounding streetscape, building facades, and neighborhood ambiance.';
  }

  private generateHistoricalContext(
    wp: MissionEnrichmentParams['waypoints'][0]
  ): string | undefined {
    if (wp.tags?.description) {
      return wp.tags.description;
    }
    if (wp.tags?.historic) {
      return `Mapped historic ${wp.tags.historic} feature in OpenStreetMap.`;
    }
    if (wp.tags?.tourism) {
      return `Public ${wp.tags.tourism} point of interest.`;
    }
    return undefined;
  }
}
