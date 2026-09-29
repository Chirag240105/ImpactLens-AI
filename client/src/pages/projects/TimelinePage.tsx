import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, CalendarX2 } from 'lucide-react';
import { q } from '@/api/queries';
import type { EvidenceType } from '@/api/types';
import { useProject } from '@/layouts/useProject';
import { EVIDENCE_TYPE_LABEL } from '@/lib/constants';
import { pluralize } from '@/lib/utils';
import { PageHeader, Tooltip } from '@/components/ui/Misc';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback';
import { MediaThumb } from '@/components/evidence/MediaThumb';
import { AiLabel } from '@/components/evidence/Badges';

const monthRange = (month: string) => {
  const [y, m] = month.split('-').map(Number);
  const last = new Date(Date.UTC(y!, m!, 0)).getUTCDate();
  return { from: `${month}-01`, to: `${month}-${String(last).padStart(2, '0')}` };
};

export default function TimelinePage() {
  const { project, projectId } = useProject();
  const query = useQuery(q.timeline(projectId));
  const months = query.data || [];
  const max = Math.max(1, ...months.map((m) => m.assetCount));

  return (
    <>
      <PageHeader eyebrow={project.name} title="Timeline" description="Evidence grouped by capture month (upload date when no capture date is known)." />
      {query.isPending ? (
        <div className="grid gap-4">
          <Skeleton className="h-40 rounded-lg" />
          <Skeleton className="h-56 rounded-lg" />
        </div>
      ) : query.isError ? (
        <Card><ErrorState error={query.error} onRetry={() => query.refetch()} /></Card>
      ) : !months.length ? (
        <Card><EmptyState icon={<CalendarX2 />} title="No dated evidence yet" description="Upload media to see how documentation builds up month by month." /></Card>
      ) : (
        <>
          <Card className="p-5">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="text-[1.0625rem] font-bold">Captures per month</h2>
              <span className="text-meta text-ink-3">{pluralize(months.reduce((n, m) => n + m.assetCount, 0), 'asset')}</span>
            </div>
            <ol className="flex h-40 items-end gap-3" aria-label="Assets captured per month">
              {months.map((m) => (
                <li key={m.month} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2">
                  <Tooltip content={`${m.label}: ${pluralize(m.assetCount, 'asset')}`}>
                    <a href={`#m-${m.month}`} className="flex w-full max-w-14 flex-1 flex-col justify-end focus-visible:outline-2 focus-visible:outline-focus" aria-label={`${m.label}: ${pluralize(m.assetCount, 'asset')}`}>
                      <span className="tabular mb-1 text-center text-label text-ink-3">{m.assetCount}</span>
                      <span className="block w-full rounded-t-md bg-accent transition-colors hover:bg-accent-hover" style={{ height: `${(m.assetCount / max) * 100}%`, minHeight: 4 }} />
                    </a>
                  </Tooltip>
                  <span className="truncate text-label font-medium text-ink-3">{m.label}</span>
                </li>
              ))}
            </ol>
          </Card>

          <ol className="relative mt-6 grid gap-4 before:absolute before:top-2 before:bottom-2 before:left-[0.6875rem] before:w-px before:bg-line max-sm:before:hidden">
            {months.map((m) => {
              const { from, to } = monthRange(m.month);
              return (
                <li key={m.month} id={`m-${m.month}`} className="relative scroll-mt-24 sm:pl-10">
                  <span aria-hidden className="absolute top-5 left-1.5 hidden size-3 rounded-full border-2 border-accent bg-surface sm:block" />
                  <Card className="p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h2 className="text-lg font-bold">{m.label}</h2>
                        <p className="text-meta text-ink-3">{pluralize(m.assetCount, 'asset')} captured</p>
                      </div>
                      <Link to={`../evidence?from=${from}&to=${to}`} relative="path" className="inline-flex items-center gap-1 text-meta font-semibold text-accent hover:underline">
                        View evidence <ArrowRight className="size-4" aria-hidden />
                      </Link>
                    </div>
                    <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
                      <div className="grid content-start gap-3">
                        <div>
                          <div className="mb-1.5"><AiLabel>AI-detected activities</AiLabel></div>
                          <div className="flex flex-wrap gap-1.5">
                            {m.activities.length ? m.activities.map((a) => <Badge key={a} tone="accent">{a}</Badge>) : <span className="text-meta text-ink-3">No activities detected</span>}
                          </div>
                        </div>
                        <div>
                          <div className="mb-1.5 text-label font-semibold tracking-[0.08em] text-ink-3 uppercase">Evidence types</div>
                          <div className="flex flex-wrap gap-1.5">
                            {Object.entries(m.evidenceTypes || {}).map(([t, n]) => (
                              <Badge key={t}>{EVIDENCE_TYPE_LABEL[t as EvidenceType]} · {n}</Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                      <ul className="grid grid-cols-4 gap-2">
                        {m.highlights.map((h) => (
                          <li key={h._id}>
                            <Link to={`../evidence?media=${h._id}`} relative="path" className="block overflow-hidden rounded-md border border-line focus-visible:outline-2 focus-visible:outline-focus">
                              <MediaThumb src={h.thumbnailUrl} alt={h.originalFilename || 'Evidence'} filename={h.originalFilename} className="aspect-square" />
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </Card>
                </li>
              );
            })}
          </ol>
        </>
      )}
    </>
  );
}
