/**
 * Reverse geocoding via OpenStreetMap Nominatim (the same OSM data behind the Locations map).
 * Only called after the user shares their location; results are cached per rounded coordinate.
 */
const cache = new Map<string, string>();

interface NominatimAddress {
  city?: string;
  town?: string;
  village?: string;
  suburb?: string;
  municipality?: string;
  county?: string;
  state_district?: string;
  state?: string;
  country?: string;
}

export async function reverseGeocode(lat: number, lng: number, signal?: AbortSignal): Promise<string | null> {
  const key = `${lat.toFixed(3)},${lng.toFixed(3)}`;
  if (cache.has(key)) return cache.get(key)!;
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=12&addressdetails=1&lat=${lat}&lon=${lng}`;
  const res = await fetch(url, { signal, headers: { Accept: 'application/json', 'Accept-Language': navigator.language || 'en' } });
  if (!res.ok) return null;
  const body = (await res.json()) as { address?: NominatimAddress };
  const a = body.address || {};
  const locality = a.city || a.town || a.village || a.suburb || a.municipality || a.county || a.state_district;
  const region = a.state || a.country;
  const name = [locality, region].filter(Boolean).join(', ') || null;
  if (name) cache.set(key, name);
  return name;
}

export const formatCoords = (lat: number, lng: number) =>
  `${Math.abs(lat).toFixed(3)}°${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lng).toFixed(3)}°${lng >= 0 ? 'E' : 'W'}`;
