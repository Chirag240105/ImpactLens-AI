import { useCallback, useEffect, useRef, useState } from 'react';
import { reverseGeocode } from '@/lib/geo';

export type LocationStatus = 'idle' | 'locating' | 'ready' | 'denied' | 'unavailable' | 'error';

export interface DeviceLocation {
  status: LocationStatus;
  lat?: number;
  lng?: number;
  /** Accuracy radius in metres reported by the browser. */
  accuracy?: number;
  /** Human place name (e.g. "Noida, Uttar Pradesh"), when reverse geocoding succeeds. */
  place?: string;
  updatedAt?: Date;
  /** Prompts for (or refreshes) the device location. Call from a user gesture. */
  request: () => void;
}

const STORAGE_KEY = 'impactlens-last-location';

function readCache(): Partial<DeviceLocation> | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as { lat: number; lng: number; accuracy?: number; place?: string; updatedAt: string };
    return { ...v, status: 'ready', updatedAt: new Date(v.updatedAt) };
  } catch {
    return null;
  }
}

/**
 * Browser geolocation + reverse-geocoded place name.
 * - If permission was already granted, locates automatically.
 * - Otherwise stays idle until `request()` is called, so the browser prompt follows a click.
 */
export function useDeviceLocation({ auto = true }: { auto?: boolean } = {}): DeviceLocation {
  const [state, setState] = useState<Omit<DeviceLocation, 'request'>>(() => ({ status: 'idle', ...readCache() }));
  const abort = useRef<AbortController | null>(null);

  const request = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setState((s) => ({ ...s, status: 'unavailable' }));
      return;
    }
    setState((s) => ({ ...s, status: 'locating' }));
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const base = { lat: coords.latitude, lng: coords.longitude, accuracy: coords.accuracy, updatedAt: new Date() };
        setState((s) => ({ ...s, ...base, status: 'ready' }));
        abort.current?.abort();
        abort.current = new AbortController();
        let place: string | undefined;
        try {
          place = (await reverseGeocode(base.lat, base.lng, abort.current.signal)) || undefined;
        } catch {
          /* offline or geocoder unavailable: coordinates are still shown */
        }
        setState((s) => ({ ...s, place }));
        try {
          sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...base, place }));
        } catch {
          /* storage blocked: location simply isn't remembered */
        }
      },
      (err) => setState((s) => ({ ...s, status: err.code === err.PERMISSION_DENIED ? 'denied' : 'error' })),
      // maximumAge 0: an explicit "Update" must return a fresh fix, not the browser's cached one.
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 },
    );
  }, []);

  useEffect(() => {
    if (!auto || !navigator.permissions?.query) return;
    let cancelled = false;
    navigator.permissions
      .query({ name: 'geolocation' })
      .then((p) => {
        if (cancelled) return;
        if (p.state === 'granted') request();
        else if (p.state === 'denied') setState((s) => ({ ...s, status: 'denied' }));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      abort.current?.abort();
    };
  }, [auto, request]);

  return { ...state, request };
}
