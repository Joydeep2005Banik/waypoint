import {
  IGeocodingService,
  IPoiService,
  IRoutingService,
  IRouteScorer,
  IRouteGenerator,
} from './interfaces';
import {
  GeoCoordinates,
  PointOfInterest,
  PreparedRoute,
  RouteGenerationOptions,
  Waypoint,
  RouteLeg,
} from '@/types/geo';
import { IAIProvider } from '@/types/ai';
import { AIProviderService } from './ai/ai-service';
import {
  haversineDistance,
  calculateBoundingBox,
  estimateWalkingDurationMinutes,
  isValidCoordinate,
} from '@/lib/geo';
import { DeterministicRouteScorer } from './scoring';

export class RouteGenerator implements IRouteGenerator {
  private poiService: IPoiService;
  private routingService: IRoutingService;
  private scorer: IRouteScorer;
  private geocodingService?: IGeocodingService;
  private aiProvider: IAIProvider;

  constructor(
    poiService: IPoiService,
    routingService: IRoutingService,
    scorer: IRouteScorer = new DeterministicRouteScorer(),
    geocodingService?: IGeocodingService,
    aiProvider?: IAIProvider
  ) {
    this.poiService = poiService;
    this.routingService = routingService;
    this.scorer = scorer;
    this.geocodingService = geocodingService;
    this.aiProvider = aiProvider || new AIProviderService();
  }

  async generateRoute(options: RouteGenerationOptions): Promise<PreparedRoute> {
    // 1. Validate inputs
    if (!isValidCoordinate(options.start)) {
      throw new Error('Invalid starting coordinates provided.');
    }

    if (options.targetDurationMinutes < 10 || options.targetDurationMinutes > 180) {
      throw new Error('Target duration must be between 10 and 180 minutes.');
    }

    if (options.maxRadiusKm < 0.2 || options.maxRadiusKm > 10) {
      throw new Error('Maximum exploration radius must be between 0.2 km and 10 km.');
    }

    const radiusMeters = options.maxRadiusKm * 1000;

    // 2. Fetch real POIs from POI service
    const pois = await this.poiService.fetchPois(
      options.start,
      radiusMeters,
      options.style
    );

    if (!pois || pois.length < 2) {
      throw new Error(
        `Insufficient mapped points of interest found within ${options.maxRadiusKm} km for style "${options.style}". Try increasing the exploration radius or selecting another exploration style.`
      );
    }

    // 3. Determine target waypoint count based on duration
    // Typical pace: ~10-12 mins per leg/waypoint stop
    const targetWpCount = Math.max(
      2,
      Math.min(6, Math.floor(options.targetDurationMinutes / 12))
    );

    // 4. Generate candidate POI subsets
    const candidates = this.buildCandidateSequences(
      options.start,
      pois,
      targetWpCount,
      options.preferLoop
    );

    if (candidates.length === 0) {
      throw new Error('Unable to construct a viable candidate waypoint path in this area.');
    }

    // 5. Evaluate and route candidates
    let bestRoute: {
      candidatePois: PointOfInterest[];
      legs: RouteLeg[];
      totalDistanceMeters: number;
      totalDurationSeconds: number;
      totalDurationMinutes: number;
      score: number;
    } | null = null;

    const candidateErrors: string[] = [];

    // Test up to top 3 candidate sequences
    for (const candidatePois of candidates.slice(0, 3)) {
      const waypointsForRouting: GeoCoordinates[] = [
        options.start,
        ...candidatePois.map((p) => p.coordinates),
      ];

      if (options.preferLoop) {
        waypointsForRouting.push(options.start);
      }

      try {
        const routeResult = await this.routingService.calculateRoute(waypointsForRouting);
        const durationMinutes = Math.round(routeResult.totalDurationSeconds / 60);

        const score = this.scorer.scoreCandidate(
          {
            waypoints: candidatePois,
            legs: routeResult.legs,
            totalDistanceMeters: routeResult.totalDistanceMeters,
            totalDurationMinutes: durationMinutes,
          },
          options
        );

        if (!bestRoute || score > bestRoute.score) {
          bestRoute = {
            candidatePois,
            legs: routeResult.legs,
            totalDistanceMeters: routeResult.totalDistanceMeters,
            totalDurationSeconds: routeResult.totalDurationSeconds,
            totalDurationMinutes: durationMinutes,
            score,
          };
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        candidateErrors.push(msg);
      }
    }

    if (!bestRoute) {
      throw new Error(
        `Failed to calculate valid pedestrian route between destinations. ${
          candidateErrors.length > 0 ? candidateErrors[0] : 'Pedestrian network path could not be resolved.'
        }`
      );
    }

    // 6. Build the final Waypoint objects
    const startName =
      options.startName ||
      (this.geocodingService
        ? await this.geocodingService.reverse(options.start).catch(() => 'Start Location')
        : 'Starting Location');

    const finalWaypoints: Waypoint[] = [];

    // Start Waypoint
    finalWaypoints.push({
      id: 'wp-start',
      order: 1,
      name: startName,
      coordinates: options.start,
      arrivalRadiusMeters: 20,
      instruction: `Begin exploration from ${startName}. Proceed to your first destination.`,
      category: 'start',
      isStart: true,
    });

    // Intermediate POI Waypoints
    bestRoute.candidatePois.forEach((poi, idx) => {
      finalWaypoints.push({
        id: `wp-${poi.id}-${idx + 1}`,
        order: idx + 2,
        name: poi.name,
        coordinates: poi.coordinates,
        arrivalRadiusMeters: 20,
        instruction: `Walk towards ${poi.name} (${poi.category}).`,
        category: poi.category,
        tags: poi.tags,
      });
    });

    // Final Waypoint (if loop, back to start)
    if (options.preferLoop) {
      finalWaypoints.push({
        id: 'wp-end',
        order: finalWaypoints.length + 1,
        name: `Return: ${startName}`,
        coordinates: options.start,
        arrivalRadiusMeters: 20,
        instruction: `Complete your walking loop by returning to ${startName}.`,
        category: 'end',
        isEnd: true,
      });
    } else if (finalWaypoints.length > 1) {
      finalWaypoints[finalWaypoints.length - 1].isEnd = true;
    }

    // 7. Calculate total geometry bounding box
    const allGeometryPoints: GeoCoordinates[] = [options.start];
    for (const leg of bestRoute.legs) {
      allGeometryPoints.push(...leg.geometry);
    }
    for (const wp of finalWaypoints) {
      allGeometryPoints.push(wp.coordinates);
    }

    const boundingBox = calculateBoundingBox(allGeometryPoints);

    const styleTitles: Record<string, string> = {
      greenway: 'Greenway & Nature Walk',
      heritage: 'Heritage & Landmark Route',
      discovery: 'Urban Discovery Trail',
      quiet: 'Quiet Paths & Parkways',
    };

    let routeTitle: string = `${styleTitles[options.style] || 'Waypoint Route'} (${
      options.preferLoop ? 'Loop' : 'Point-to-Point'
    })`;
    let routeTheme: string = options.style;
    let routeSummary: string = `A curated ${options.targetDurationMinutes}-minute walking route connecting ${finalWaypoints.length} waypoints.`;
    let aiEnrichmentResult = undefined;

    // 8. Enrich with open-weight AI or deterministic fallback
    try {
      const enrichment = await this.aiProvider.enrichMission({
        explorationStyle: options.style,
        targetDurationMinutes: options.targetDurationMinutes,
        totalDistanceMeters: bestRoute.totalDistanceMeters,
        isLoop: options.preferLoop,
        startLocationName: startName,
        waypoints: finalWaypoints.map((w) => ({
          id: w.id,
          name: w.name,
          category: w.category,
          order: w.order,
          tags: w.tags,
        })),
      });

      aiEnrichmentResult = enrichment;
      if (enrichment.title) routeTitle = enrichment.title;
      if (enrichment.theme) routeTheme = enrichment.theme;
      if (enrichment.summary) routeSummary = enrichment.summary;

      // Attach enriched instructions and observation prompts to waypoints
      for (const item of enrichment.waypoints) {
        const matchingWp = finalWaypoints.find((w) => w.id === item.waypointId);
        if (matchingWp) {
          if (item.instruction) matchingWp.instruction = item.instruction;
          if (item.observationPrompt) matchingWp.observationPrompt = item.observationPrompt;
          if (item.historicalContext) matchingWp.historicalContext = item.historicalContext;
        }
      }
    } catch (enrichError: unknown) {
      console.warn('AI enrichment skipped, using deterministic route instructions.', enrichError);
    }

    return {
      id: `route-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title: routeTitle,
      theme: routeTheme,
      thematicSummary: routeSummary,
      aiEnrichment: aiEnrichmentResult,
      explorationStyle: options.style,
      startLocation: {
        name: startName,
        coordinates: options.start,
      },
      targetDurationMinutes: options.targetDurationMinutes,
      maxRadiusKm: options.maxRadiusKm,
      isLoop: options.preferLoop,
      waypoints: finalWaypoints,
      legs: bestRoute.legs,
      totalDistanceMeters: bestRoute.totalDistanceMeters,
      totalDurationMinutes: bestRoute.totalDurationMinutes,
      boundingBox,
      createdAt: new Date().toISOString(),
      candidateScore: bestRoute.score,
    };
  }

  private buildCandidateSequences(
    start: GeoCoordinates,
    pois: PointOfInterest[],
    count: number,
    isLoop: boolean
  ): PointOfInterest[][] {
    // Sort POIs by relevance
    const pool = [...pois].sort((a, b) => b.relevanceScore - a.relevanceScore);
    const topPool = pool.slice(0, Math.min(pool.length, 12));

    const candidates: PointOfInterest[][] = [];

    // Candidate Strategy 1: Greedy Nearest-Neighbor Path
    const greedySeq = this.buildGreedySequence(start, topPool, count);
    if (greedySeq.length >= 2) {
      candidates.push(greedySeq);
    }

    // Candidate Strategy 2: Radial Angle / Directional Sweep (great for loops)
    const angularSeq = this.buildAngularSweepSequence(start, topPool, count, true);
    if (angularSeq.length >= 2) {
      candidates.push(angularSeq);
    }

    // Candidate Strategy 3: Reverse Angular Sweep
    const revAngularSeq = this.buildAngularSweepSequence(start, topPool, count, false);
    if (revAngularSeq.length >= 2) {
      candidates.push(revAngularSeq);
    }

    return candidates;
  }

  private buildGreedySequence(
    start: GeoCoordinates,
    pois: PointOfInterest[],
    count: number
  ): PointOfInterest[] {
    const unvisited = [...pois];
    const sequence: PointOfInterest[] = [];
    let currentPos = start;

    while (unvisited.length > 0 && sequence.length < count) {
      let nearestIdx = -1;
      let minDistance = Infinity;

      for (let i = 0; i < unvisited.length; i++) {
        const d = haversineDistance(currentPos, unvisited[i].coordinates);
        if (d < minDistance) {
          minDistance = d;
          nearestIdx = i;
        }
      }

      if (nearestIdx !== -1) {
        const nextPoi = unvisited.splice(nearestIdx, 1)[0];
        sequence.push(nextPoi);
        currentPos = nextPoi.coordinates;
      } else {
        break;
      }
    }

    return sequence;
  }

  private buildAngularSweepSequence(
    start: GeoCoordinates,
    pois: PointOfInterest[],
    count: number,
    clockwise: boolean
  ): PointOfInterest[] {
    // Calculate polar angle from start
    const withAngles = pois.map((poi) => {
      const dLat = poi.coordinates.latitude - start.latitude;
      const dLng = poi.coordinates.longitude - start.longitude;
      let angle = Math.atan2(dLat, dLng);
      if (angle < 0) angle += 2 * Math.PI;
      return { poi, angle };
    });

    withAngles.sort((a, b) => (clockwise ? a.angle - b.angle : b.angle - a.angle));

    return withAngles.slice(0, count).map((item) => item.poi);
  }
}
