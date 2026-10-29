import { Coordinates, RouteInfo } from '../types/database';

export interface PresetLocation {
  id: string;
  name: string;
  district: string;
  address: string;
  coordinates: Coordinates;
  type: 'restaurant' | 'hub' | 'residential';
}

// Preset popular gastronomic & commercial hubs in Lima for fast restaurant testing
export const PRESET_LOCATIONS: PresetLocation[] = [
  {
    id: 'miraflores-lamar',
    name: 'Av. La Mar (Corredor Gastronómico)',
    district: 'Miraflores',
    address: 'Av. La Mar 1263, Miraflores',
    coordinates: { latitude: -12.1154, longitude: -77.0428 },
    type: 'restaurant',
  },
  {
    id: 'miraflores-kennedy',
    name: 'Parque Kennedy / Óvalo de Miraflores',
    district: 'Miraflores',
    address: 'Diagonal 340, Miraflores',
    coordinates: { latitude: -12.1215, longitude: -77.0295 },
    type: 'hub',
  },
  {
    id: 'san-isidro-dasso',
    name: 'Calle Miguel Dasso (Zona Gourmet)',
    district: 'San Isidro',
    address: 'Calle Miguel Dasso 155, San Isidro',
    coordinates: { latitude: -12.0991, longitude: -77.0372 },
    type: 'restaurant',
  },
  {
    id: 'barranco-pedro-osma',
    name: 'Av. Pedro de Osma',
    district: 'Barranco',
    address: 'Av. Pedro de Osma 409, Barranco',
    coordinates: { latitude: -12.1518, longitude: -77.0217 },
    type: 'restaurant',
  },
  {
    id: 'surco-chacarilla',
    name: 'Chacarilla del Estanque',
    district: 'Santiago de Surco',
    address: 'Av. Primavera 640, Surco',
    coordinates: { latitude: -12.1105, longitude: -76.9936 },
    type: 'residential',
  },
  {
    id: 'san-borja-aviacion',
    name: 'Av. Aviación & Javier Prado',
    district: 'San Borja',
    address: 'Av. Aviación 2500, San Borja',
    coordinates: { latitude: -12.0886, longitude: -77.0012 },
    type: 'residential',
  },
  {
    id: 'magdalena-mercado',
    name: 'Mercado de Magdalena',
    district: 'Magdalena del Mar',
    address: 'Jr. Bolognesi 502, Magdalena del Mar',
    coordinates: { latitude: -12.0911, longitude: -77.0706 },
    type: 'hub',
  },
];

// Calculate straight-line Haversine distance in km
export function calculateHaversineDistanceKm(
  coord1: Coordinates,
  coord2: Coordinates
): number {
  const R = 6371; // Earth radius in kilometers
  const dLat = ((coord2.latitude - coord1.latitude) * Math.PI) / 180;
  const dLon = ((coord2.longitude - coord1.longitude) * Math.PI) / 180;
  const lat1 = (coord1.latitude * Math.PI) / 180;
  const lat2 = (coord2.latitude * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Number((R * c).toFixed(2));
}

// Convert KM to Miles
export function kmToMiles(km: number): number {
  return Number((km * 0.621371).toFixed(2));
}

// Generate intermediate curved polyline coordinates between two points (fallback when offline)
function generateSimulatedRoadRoute(
  start: Coordinates,
  end: Coordinates,
  points = 12
): [number, number][] {
  const result: [number, number][] = [];
  const midLat = (start.latitude + end.latitude) / 2;
  const midLng = (start.longitude + end.longitude) / 2;
  
  // Slight curve offset to simulate real street turns
  const offset = 0.002;

  for (let i = 0; i <= points; i++) {
    const t = i / points;
    // Quadratic bezier curve
    const lat =
      (1 - t) * (1 - t) * start.latitude +
      2 * (1 - t) * t * (midLat + offset) +
      t * t * end.latitude;
    const lng =
      (1 - t) * (1 - t) * start.longitude +
      2 * (1 - t) * t * (midLng - offset) +
      t * t * end.longitude;
    result.push([lat, lng]);
  }
  return result;
}

/**
 * Fetch driving route with exact road mileage and duration using OSRM
 */
export async function getRouteBetweenPoints(
  origin: Coordinates,
  destination: Coordinates
): Promise<RouteInfo> {
  const originStr = `${origin.longitude.toFixed(6)},${origin.latitude.toFixed(6)}`;
  const destStr = `${destination.longitude.toFixed(6)},${destination.latitude.toFixed(6)}`;

  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${originStr};${destStr}?overview=full&geometries=geojson`;
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const distanceKm = Number((route.distance / 1000).toFixed(2));
        const distanceMiles = kmToMiles(distanceKm);
        const durationMinutes = Math.max(1, Math.round(route.duration / 60));

        // OSRM coordinates are in [longitude, latitude] GeoJSON format.
        // Convert to [latitude, longitude] for map rendering
        const coordinates: [number, number][] = route.geometry.coordinates.map(
          (pt: [number, number]) => [pt[1], pt[0]]
        );

        return {
          distanceKm,
          distanceMiles,
          durationMinutes,
          coordinates,
          summary: route.legs?.[0]?.summary || 'Vía principal',
        };
      }
    }
  } catch (err) {
    console.warn('OSRM routing request failed, falling back to simulated road route:', err);
  }

  // Fallback: Haversine with 1.35x urban road tortuosity
  const straightKm = calculateHaversineDistanceKm(origin, destination);
  const roadDistanceKm = Number((straightKm * 1.35).toFixed(2));
  const distanceMiles = kmToMiles(roadDistanceKm);
  // Estimated courier speed: 28 km/h in city traffic
  const durationMinutes = Math.max(3, Math.round((roadDistanceKm / 28) * 60) + 4);
  const coordinates = generateSimulatedRoadRoute(origin, destination);

  return {
    distanceKm: roadDistanceKm,
    distanceMiles,
    durationMinutes,
    coordinates,
    summary: 'Ruta estimada en vía urbana',
  };
}

/**
 * Geocode address query using Nominatim OpenStreetMap
 */
export async function searchAddress(query: string): Promise<
  Array<{
    displayName: string;
    latitude: number;
    longitude: number;
  }>
> {
  if (!query || query.trim().length < 3) return [];

  // Check preset locations first
  const cleanQuery = query.toLowerCase().trim();
  const matchedPresets = PRESET_LOCATIONS.filter(
    (p) =>
      p.name.toLowerCase().includes(cleanQuery) ||
      p.address.toLowerCase().includes(cleanQuery) ||
      p.district.toLowerCase().includes(cleanQuery)
  ).map((p) => ({
    displayName: `${p.name} (${p.address})`,
    latitude: p.coordinates.latitude,
    longitude: p.coordinates.longitude,
  }));

  try {
    const encoded = encodeURIComponent(`${query}, Lima, Peru`);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encoded}&limit=5`,
      {
        headers: {
          'User-Agent': 'AlamanoDeliveryApp/1.0',
        },
      }
    );

    if (res.ok) {
      const items = await res.json();
      const nominatimResults = items.map((item: any) => ({
        displayName: item.display_name,
        latitude: parseFloat(item.lat),
        longitude: parseFloat(item.lon),
      }));

      // Merge presets first, then OSM results without duplicates
      return [...matchedPresets, ...nominatimResults].slice(0, 6);
    }
  } catch (err) {
    console.warn('Geocoding search failed:', err);
  }

  return matchedPresets;
}
