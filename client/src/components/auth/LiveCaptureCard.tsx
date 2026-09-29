import { useQuery } from '@tanstack/react-query';
import { Clock3, Cpu, Loader2, LocateFixed, MapPin, MapPinOff, RefreshCw } from 'lucide-react';
import { q } from '@/api/queries';
import { useDeviceLocation } from '@/hooks/useDeviceLocation';
import { useNow } from '@/hooks/useNow';
import { formatCoords } from '@/lib/geo';

const timeFmt = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const zone = () => new Intl.DateTimeFormat('en-GB', { timeZoneName: 'short' }).formatToParts(new Date()).find((p) => p.type === 'timeZoneName')?.value;

const chipBtn =
  'inline-flex h-7 items-center gap-1.5 rounded-full border border-on-media/30 px-2.5 text-label font-semibold text-on-media transition-colors hover:bg-on-media/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-media disabled:opacity-60';

/**
 * Live capture context on the auth screen: the real current time, the viewer's device location
 * (asked for on click, refreshable) and the API's actual AI mode — no hardcoded sample values.
 */
export function LiveCaptureCard() {
  const now = useNow();
  const loc = useDeviceLocation();
  const health = useQuery(q.health());
  const ai = health.data?.aiProvider;

  let locationRow;
  if (loc.status === 'ready' && loc.lat !== undefined && loc.lng !== undefined) {
    locationRow = (
      <>
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <MapPin className="size-3.5 shrink-0" aria-hidden />
          <span className="truncate">{loc.place || formatCoords(loc.lat, loc.lng)}</span>
        </span>
        <span className="text-on-media/70">
          Device location{loc.accuracy ? ` · ±${loc.accuracy < 1000 ? `${Math.round(loc.accuracy)} m` : `${(loc.accuracy / 1000).toFixed(1)} km`}` : ''}
        </span>
        <button type="button" className={chipBtn} onClick={loc.request} aria-label="Update my location">
          <RefreshCw className="size-3" aria-hidden /> Update
        </button>
      </>
    );
  } else if (loc.status === 'locating') {
    locationRow = (
      <span className="inline-flex items-center gap-1.5" role="status">
        <Loader2 className="size-3.5 animate-spin" aria-hidden /> Finding your location…
      </span>
    );
  } else if (loc.status === 'denied') {
    locationRow = (
      <>
        <span className="inline-flex items-center gap-1.5">
          <MapPinOff className="size-3.5" aria-hidden /> Location access is blocked
        </span>
        <span className="text-on-media/70">Allow it in your browser’s site settings, then</span>
        <button type="button" className={chipBtn} onClick={loc.request}>
          <RefreshCw className="size-3" aria-hidden /> Try again
        </button>
      </>
    );
  } else {
    locationRow = (
      <>
        <span className="inline-flex items-center gap-1.5">
          <MapPinOff className="size-3.5" aria-hidden />
          {loc.status === 'unavailable' ? 'Location isn’t available on this device' : loc.status === 'error' ? 'Couldn’t get your location' : 'Location not shared yet'}
        </span>
        {loc.status !== 'unavailable' && (
          <button type="button" className={chipBtn} onClick={loc.request}>
            <LocateFixed className="size-3" aria-hidden /> Share my location
          </button>
        )}
      </>
    );
  }

  return (
    <div className="max-w-md rounded-xl border border-on-media/15 bg-media-glass p-5 text-on-media backdrop-blur-md">
      <div className="text-label font-semibold tracking-[0.08em] text-on-media/80 uppercase">Your capture context · live</div>
      <p className="mt-2 font-display text-lg leading-snug font-bold">
        Every photo you upload is stamped with when, where and how it was analyzed.
      </p>
      <dl className="mt-4 grid gap-2.5 text-meta">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5" aria-live="polite">
          <dt className="sr-only">Location</dt>
          <dd className="contents">{locationRow}</dd>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <dt className="sr-only">Date and time</dt>
          <dd className="inline-flex items-center gap-1.5">
            <Clock3 className="size-3.5" aria-hidden />
            <time dateTime={now.toISOString()}>{timeFmt.format(now)}</time>
            <span className="text-on-media/70">{zone()}</span>
          </dd>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <dt className="sr-only">AI analysis</dt>
          <dd className="inline-flex items-center gap-1.5">
            <Cpu className="size-3.5" aria-hidden />
            {health.isPending
              ? 'Checking AI service…'
              : health.isError
                ? 'AI service unreachable'
                : ai === 'mock'
                  ? 'AI: demo mode (mock provider)'
                  : `AI: ${ai}`}
          </dd>
        </div>
      </dl>
    </div>
  );
}
