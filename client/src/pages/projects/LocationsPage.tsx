import { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, MapPinOff } from 'lucide-react';
import { q } from '@/api/queries';
import { useProject } from '@/layouts/useProject';
import { LOCATION_SOURCES, LOCATION_SOURCE_HINT } from '@/lib/constants';
import { pluralize } from '@/lib/utils';
import { PageHeader } from '@/components/ui/Misc';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { EmptyState, ErrorState, InlineAlert, Skeleton } from '@/components/ui/Feedback';
import { LocationSourceBadge } from '@/components/evidence/Badges';

// Leaflet is only loaded on this route.
const EvidenceMap = lazy(() => import('@/components/EvidenceMap'));

export default function LocationsPage() {
  const { project, projectId } = useProject();
  const query = useQuery(q.locations(projectId));
  const groups = [...(query.data || [])].sort((a, b) => b.count - a.count);
  const mappable = groups.filter((g) => Number.isFinite(g.lat) && Number.isFinite(g.lng));
  const estimated = groups.filter((g) => g.source === 'AI_ESTIMATED').reduce((n, g) => n + g.count, 0);

  return (
    <>
      <PageHeader eyebrow={project.name} title="Locations" description="Where evidence was captured, and how each location is known." />
      {query.isPending ? (
        <Skeleton className="h-[420px] rounded-lg" />
      ) : query.isError ? (
        <Card><ErrorState error={query.error} onRetry={() => query.refetch()} /></Card>
      ) : !groups.length ? (
        <Card><EmptyState icon={<MapPinOff />} title="No locations yet" description="Upload geotagged photos or add coordinates at upload to place evidence on the map." /></Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <Card className="self-start overflow-hidden">
            {mappable.length ? (
              <Suspense fallback={<Skeleton className="h-[460px] rounded-none" />}>
                <EvidenceMap groups={mappable} />
              </Suspense>
            ) : (
              <EmptyState icon={<MapPinOff />} title="No coordinates to map" description="These locations have names but no latitude/longitude." />
            )}
          </Card>
          <div className="grid content-start gap-4">
            {estimated > 0 && (
              <InlineAlert tone="warning" title={`${pluralize(estimated, 'asset')} with AI-estimated locations`}>
                These are guesses from visual cues and are shown with dashed markers. Don’t treat them as ground truth.
              </InlineAlert>
            )}
            <Card>
              <CardHeader title="All locations" description={pluralize(groups.length, 'place')} />
              <CardBody className="pt-3">
                <ul className="divide-y divide-line">
                  {groups.map((g) => (
                    <li key={g.name} className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold">{g.name}</div>
                        <div className="mt-1"><LocationSourceBadge source={g.source} /></div>
                      </div>
                      <Link to={`../evidence?location=${encodeURIComponent(g.name === 'Unknown' ? '' : g.name)}`} relative="path" className="inline-flex shrink-0 items-center gap-1 text-meta font-semibold text-accent hover:underline">
                        {pluralize(g.count, 'asset')} <ArrowRight className="size-4" aria-hidden />
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="How locations are known" />
              <CardBody className="grid gap-3 pt-3">
                {LOCATION_SOURCES.map((s) => (
                  <div key={s} className="grid gap-1">
                    <span><LocationSourceBadge source={s} /></span>
                    <p className="text-meta text-ink-3">{LOCATION_SOURCE_HINT[s]}</p>
                  </div>
                ))}
              </CardBody>
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
