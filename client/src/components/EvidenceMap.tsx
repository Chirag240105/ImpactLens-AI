import { useEffect, useMemo, useState } from 'react';
import { CircleMarker, MapContainer, TileLayer, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { LocationGroup, LocationSource } from '@/api/types';
import { LOCATION_SOURCE_LABEL } from '@/lib/constants';
import { useUiStore } from '@/store/ui';

// Leaflet writes colours as SVG attributes, where var() doesn't resolve, so read the token values.
const STYLE: Record<LocationSource, { token: string; dashArray?: string; fillOpacity: number }> = {
  GPS_VERIFIED: { token: '--success', fillOpacity: 0.55 },
  USER_PROVIDED: { token: '--info', fillOpacity: 0.45 },
  AI_ESTIMATED: { token: '--warning', dashArray: '4 4', fillOpacity: 0.15 },
  UNKNOWN: { token: '--text-tertiary', fillOpacity: 0.2 },
};
const tokenValue = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

export default function EvidenceMap({ groups }: { groups: LocationGroup[] }) {
  const bounds = useMemo(() => groups.map((g) => [g.lat!, g.lng!] as [number, number]), [groups]);
  const max = Math.max(1, ...groups.map((g) => g.count));
  // Re-read token values when the theme preference changes (the layout applies it before paint).
  const theme = useUiStore((s) => s.theme);
  const readColors = () => Object.fromEntries(Object.entries(STYLE).map(([k, v]) => [k, tokenValue(v.token)]));
  const [colors, setColors] = useState<Record<string, string>>(readColors);
  useEffect(() => {
    // Child effects run before the layout's theme effect, so read on the next frame.
    const id = requestAnimationFrame(() => setColors(readColors()));
    return () => cancelAnimationFrame(id);
  }, [theme]);
  return (
    <div className="h-[460px] max-sm:h-[340px]">
      <MapContainer
        bounds={bounds.length > 1 ? bounds : undefined}
        center={bounds.length === 1 ? bounds[0] : undefined}
        zoom={bounds.length === 1 ? 11 : undefined}
        boundsOptions={{ padding: [48, 48] }}
        scrollWheelZoom={false}
        className="size-full rounded-none"
        aria-label="Map of evidence locations"
      >
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {groups.map((g) => {
          const s = STYLE[g.source];
          const color = colors[g.source];
          return (
            <CircleMarker
              key={g.name}
              center={[g.lat!, g.lng!]}
              radius={10 + (g.count / max) * 18}
              pathOptions={{ color, fillColor: color, fillOpacity: s.fillOpacity, weight: 2, dashArray: s.dashArray }}
            >
              <Tooltip direction="top" offset={[0, -8]}>
                <b>{g.name}</b> · {g.count} assets
                <br />
                {LOCATION_SOURCE_LABEL[g.source]}
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
