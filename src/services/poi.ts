import { IPoiService } from './interfaces';
import { GeoCoordinates, PointOfInterest, ExplorationStyle } from '@/types/geo';
import { haversineDistance } from '@/lib/geo';

export class OverpassPoiService implements IPoiService {
  private baseUrl: string;
  private userAgent: string;

  constructor(
    baseUrl: string = process.env.NEXT_PUBLIC_OVERPASS_API_URL || 'https://overpass-api.de/api/interpreter',
    userAgent: string = 'WaypointAutopilot/0.1.0'
  ) {
    this.baseUrl = baseUrl;
    this.userAgent = userAgent;
  }

  private buildOverpassQuery(
    center: GeoCoordinates,
    radiusMeters: number,
    style: ExplorationStyle
  ): string {
    const lat = center.latitude;
    const lng = center.longitude;
    const rad = Math.min(radiusMeters, 4000); // safety cap

    let tagFilters = '';
    switch (style) {
      case 'greenway':
        tagFilters = `
          nwr["leisure"="park"](around:${rad},${lat},${lng});
          nwr["leisure"="garden"](around:${rad},${lat},${lng});
          nwr["leisure"="nature_reserve"](around:${rad},${lat},${lng});
          nwr["natural"="wood"](around:${rad},${lat},${lng});
          nwr["natural"="water"](around:${rad},${lat},${lng});
          nwr["landuse"="recreation_ground"](around:${rad},${lat},${lng});
        `;
        break;

      case 'heritage':
        tagFilters = `
          nwr["historic"](around:${rad},${lat},${lng});
          nwr["tourism"="artwork"](around:${rad},${lat},${lng});
          nwr["tourism"="museum"](around:${rad},${lat},${lng});
          nwr["tourism"="attraction"](around:${rad},${lat},${lng});
          nwr["tourism"="viewpoint"](around:${rad},${lat},${lng});
          nwr["heritage"](around:${rad},${lat},${lng});
        `;
        break;

      case 'discovery':
        tagFilters = `
          nwr["tourism"="artwork"](around:${rad},${lat},${lng});
          nwr["amenity"="fountain"](around:${rad},${lat},${lng});
          nwr["amenity"="marketplace"](around:${rad},${lat},${lng});
          nwr["amenity"="community_centre"](around:${rad},${lat},${lng});
          nwr["leisure"="plaza"](around:${rad},${lat},${lng});
          nwr["highway"="pedestrian"](around:${rad},${lat},${lng});
        `;
        break;

      case 'quiet':
      default:
        tagFilters = `
          nwr["leisure"="park"](around:${rad},${lat},${lng});
          nwr["leisure"="garden"](around:${rad},${lat},${lng});
          nwr["highway"="living_street"](around:${rad},${lat},${lng});
          nwr["highway"="pedestrian"](around:${rad},${lat},${lng});
          nwr["highway"="footway"](around:${rad},${lat},${lng});
        `;
        break;
    }

    return `
      [out:json][timeout:15];
      (
        ${tagFilters}
      );
      out center 30;
    `.trim();
  }

  async fetchPois(
    center: GeoCoordinates,
    radiusMeters: number,
    style: ExplorationStyle
  ): Promise<PointOfInterest[]> {
    const query = this.buildOverpassQuery(center, radiusMeters, style);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 16000);

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': this.userAgent,
          Accept: 'application/json',
        },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(
          `Overpass POI service error (HTTP ${response.status}). The public service may be busy.`
        );
      }

      const data = await response.json();
      if (!data || !Array.isArray(data.elements)) {
        return [];
      }

      const pois: PointOfInterest[] = [];

      for (const el of data.elements) {
        // Exclude private access
        if (el.tags && (el.tags.access === 'private' || el.tags.access === 'no')) {
          continue;
        }

        let lat: number | null = null;
        let lng: number | null = null;

        if (typeof el.lat === 'number' && typeof el.lon === 'number') {
          lat = el.lat;
          lng = el.lon;
        } else if (el.center && typeof el.center.lat === 'number' && typeof el.center.lon === 'number') {
          lat = el.center.lat;
          lng = el.center.lon;
        }

        if (lat === null || lng === null || isNaN(lat) || isNaN(lng)) {
          continue;
        }

        const tags: Record<string, string> = el.tags || {};
        const name =
          tags.name ||
          tags['name:en'] ||
          tags.description ||
          this.generateFallbackPoiName(tags, style);

        const category =
          tags.leisure ||
          tags.historic ||
          tags.tourism ||
          tags.amenity ||
          tags.natural ||
          tags.highway ||
          'destination';

        const coords = { latitude: lat, longitude: lng };
        const distFromStart = haversineDistance(center, coords);

        // Filter out items beyond the search radius
        if (distFromStart > radiusMeters * 1.05) {
          continue;
        }

        pois.push({
          id: `osm-${el.type}-${el.id}`,
          name,
          coordinates: coords,
          category,
          relevanceScore: this.calculateRelevance(tags, style, distFromStart, radiusMeters),
          tags,
          distanceFromStartMeters: distFromStart,
        });
      }

      // Deduplicate POIs that are clustered within 40 meters of each other
      return this.deduplicatePois(pois);
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('POI service request timed out. Please try a smaller exploration radius.');
      }
      throw error;
    }
  }

  private generateFallbackPoiName(tags: Record<string, string>, style: ExplorationStyle): string {
    if (tags.leisure === 'park') return 'Public Park';
    if (tags.leisure === 'garden') return 'Community Garden';
    if (tags.tourism === 'artwork') return 'Public Art Installation';
    if (tags.tourism === 'viewpoint') return 'Scenic Viewpoint';
    if (tags.historic) return `Historic Landmark (${tags.historic})`;
    if (tags.amenity === 'fountain') return 'Civic Fountain';
    if (tags.amenity === 'marketplace') return 'Market Square';
    if (tags.highway === 'pedestrian') return 'Pedestrian Promenade';
    if (style === 'greenway') return 'Nature Greenway';
    if (style === 'heritage') return 'Heritage Site';
    return 'Exploration Waypoint';
  }

  private calculateRelevance(
    tags: Record<string, string>,
    style: ExplorationStyle,
    dist: number,
    radius: number
  ): number {
    let score = 10;
    if (tags.name) score += 15;
    if (tags.wikipedia || tags.wikidata) score += 10;
    if (tags.description) score += 5;

    // Favor balanced distribution across the radius rather than all huddled at center
    const normalizedDist = dist / radius;
    if (normalizedDist >= 0.25 && normalizedDist <= 0.85) {
      score += 10;
    }

    return score;
  }

  private deduplicatePois(pois: PointOfInterest[]): PointOfInterest[] {
    const sorted = [...pois].sort((a, b) => b.relevanceScore - a.relevanceScore);
    const unique: PointOfInterest[] = [];

    for (const poi of sorted) {
      const isDuplicate = unique.some(
        (existing) => haversineDistance(existing.coordinates, poi.coordinates) < 40
      );
      if (!isDuplicate) {
        unique.push(poi);
      }
    }

    return unique;
  }
}
