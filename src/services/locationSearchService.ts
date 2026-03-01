// services/locationSearchService.ts

export interface SearchResult {
  name: string;
  displayName: string;
  latitude: number;
  longitude: number;
  type: string;
  importance: number;
}

/**
 * Search for locations using Nominatim (OpenStreetMap)
 * FREE - No API key required
 */
export const searchLocation = async (
  query: string,
  limitResults: number = 5,
): Promise<SearchResult[]> => {
  if (!query || query.trim().length < 3) {
    console.log('[Search] Query too short:', query);
    return [];
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?` +
      `q=${encodeURIComponent(query)}&` +
      `format=json&` +
      `limit=${limitResults}&` +
      `addressdetails=1`;
    
    console.log('[Search] Fetching:', url);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'LocationAlertApp/1.0',
        'Accept': 'application/json',
      },
    });

    console.log('[Search] Response status:', response.status);

    if (!response.ok) {
      console.error('[Search] HTTP error:', response.status, response.statusText);
      return [];
    }

    const data = await response.json();
    console.log('[Search] Results count:', data.length);
    console.log('[Search] First result:', data[0]);

    if (!Array.isArray(data)) {
      console.error('[Search] Data is not an array:', data);
      return [];
    }

    const results = data.map((item: any) => ({
      name: item.name || item.display_name.split(',')[0],
      displayName: item.display_name,
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon),
      type: item.type || 'unknown',
      importance: item.importance || 0,
    }));

    console.log('[Search] Mapped results:', results.length);
    return results;
  } catch (error) {
    console.error('[Search] Error:', error);
    return [];
  }
};

/**
 * Search locations near a specific point
 */
export const searchNearby = async (
  query: string,
  centerLat: number,
  centerLng: number,
  radiusKm: number = 10,
): Promise<SearchResult[]> => {
  if (!query || query.trim().length < 3) {
    return [];
  }

  try {
    // Create a bounding box around the center point
    const latDelta = radiusKm / 111; // 1 degree latitude ≈ 111km
    const lngDelta = radiusKm / (111 * Math.cos(centerLat * Math.PI / 180));

    const viewbox = [
      centerLng - lngDelta,
      centerLat - latDelta,
      centerLng + lngDelta,
      centerLat + latDelta,
    ].join(',');

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?` +
      `q=${encodeURIComponent(query)}&` +
      `format=json&` +
      `limit=10&` +
      `viewbox=${viewbox}&` +
      `bounded=1&` +
      `addressdetails=1`,
      {
        headers: {
          'User-Agent': 'LocationAlertApp/1.0',
        },
      }
    );

    const data = await response.json();

    return data.map((item: any) => ({
      name: item.name || item.display_name.split(',')[0],
      displayName: item.display_name,
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon),
      type: item.type,
      importance: item.importance,
    }));
  } catch (error) {
    console.error('Search error:', error);
    return [];
  }
};