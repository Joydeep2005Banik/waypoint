import { IGeocodingService } from './interfaces';
import { GeoCoordinates, GeocodingResult } from '@/types/geo';

export class NominatimGeocodingService implements IGeocodingService {
  private baseUrl: string;
  private userAgent: string;

  constructor(
    baseUrl: string = 'https://nominatim.openstreetmap.org',
    userAgent: string = 'WaypointAutopilot/0.1.0'
  ) {
    this.baseUrl = baseUrl;
    this.userAgent = userAgent;
  }

  async search(query: string): Promise<GeocodingResult[]> {
    const trimmed = query.trim();
    if (!trimmed) {
      return [];
    }

    const url = new URL(`${this.baseUrl}/search`);
    url.searchParams.set('q', trimmed);
    url.searchParams.set('format', 'json');
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('limit', '5');

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(url.toString(), {
        headers: {
          'User-Agent': this.userAgent,
          Accept: 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Geocoding failed with status HTTP ${response.status}`);
      }

      const data = await response.json();
      if (!Array.isArray(data)) {
        return [];
      }

      return data.map((item: Record<string, unknown>) => {
        const lat = parseFloat(String(item.lat));
        const lng = parseFloat(String(item.lon));
        const displayName = String(item.display_name || '');
        const name = String(item.name || displayName.split(',')[0] || trimmed);

        return {
          name,
          displayName,
          coordinates: { latitude: lat, longitude: lng },
          type: String(item.type || item.class || 'place'),
        };
      });
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Geocoding request timed out. Please check your network connection.');
      }
      throw error;
    }
  }

  async reverse(coords: GeoCoordinates): Promise<string> {
    const url = new URL(`${this.baseUrl}/reverse`);
    url.searchParams.set('lat', coords.latitude.toString());
    url.searchParams.set('lon', coords.longitude.toString());
    url.searchParams.set('format', 'json');

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(url.toString(), {
        headers: {
          'User-Agent': this.userAgent,
          Accept: 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`;
      }

      const data = await response.json();
      return (
        data.display_name?.split(',').slice(0, 2).join(',').trim() ||
        `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`
      );
    } catch {
      return `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`;
    }
  }
}
