import { useMemo, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Clock, Cloud, Cpu, FileImage, Lightbulb, Link2, Quote, Sparkles } from 'lucide-react';
import { q } from '@/api/queries';
import { useGenerateInsights } from '@/api/mutations';
import type { InsightKind } from '@/api/types';
import { useProject } from '@/layouts/useProject';
import { INSIGHT_KIND_LABEL } from '@/lib/constants';
import { cn, formatDateTime, pluralize } from '@/lib/utils';
import { MonoId, PageHeader, Segmented } from '@/components/ui/Misc';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Drawer } from '@/components/ui/Overlay';
import { EmptyState, ErrorState, InlineAlert, Skeleton } from '@/components/ui/Feedback';
import { ConfidenceBadge, LocationSourceBadge, TrustKindBadge } from '@/components/evidence/Badges';
import { MediaThumb } from '@/components/evidence/MediaThumb';

function ChainStep({ icon, label, children, last }: { icon: ReactNode; label: string; children: ReactNode; last?: boolean }) {
  return (
    <li className="relative grid grid-cols-[2rem_minmax(0,1fr)] gap-3 pb-4">
      {!last && <span aria-hidden className="absolute top-8 bottom-0 left-4 w-px bg-line" />}
      <span className="grid size-8 place-items-center rounded-full bg-accent-soft text-accent [&_svg]:size-4" aria-hidden>{icon}</span>
      <div className="min-w-0 pt-1">
        <div className="text-label font-semibold tracking-[0.08em] text-ink-3 uppercase">{label}</div>
        <div className="mt-1 text-meta text-ink-2">{children}</div>
      </div>
    </li>
  );
}

function TraceDrawer({ insightId, onClose, projectId }: { insightId: string | null; onClose: () => void; projectId: string }) {
  const query = useQuery({ ...q.trace(insightId || ''), enabled: Boolean(insightId) });
  const t = query.data;
  return (
    <Drawer open={Boolean(insightId)} onOpenChange={(o) => !o && onClose()} title="Evidence trace" description="Claim → source media → Cloudinary asset → AI model → timestamp">
      {query.isPending && insightId ? (
        <div className="grid gap-3 p-5"><Skeleton className="h-20" /><Skeleton className="h-40" /></div>
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : t ? (
        <div className="p-5">
          <figure className="rounded-lg border border-line bg-surface-alt p-4">
            <Quote className="size-4 text-ink-3" aria-hidden />
            <blockquote className="mt-2 font-display text-base leading-snug font-semibold">{t.insight.statement}</blockquote>
            <figcaption className="mt-3 flex flex-wrap gap-1.5">
              <TrustKindBadge kind={t.insight.kind} />
              <ConfidenceBadge value={t.insight.confidence} />
            </figcaption>
          </figure>
          <h3 className="mt-6 mb-3 font-sans text-sm font-semibold">{pluralize(t.sources.length, 'source')} behind this claim</h3>
          <ol className="grid gap-4">
            {t.sources.map((s, i) => (
              <li key={s.mediaId} className="rounded-lg border border-line p-4">
                <div className="mb-4 flex items-center gap-3">
                  <MediaThumb src={s.thumbnailUrl} alt={s.originalFilename || `Source ${i + 1}`} filename={s.originalFilename} className="size-16 shrink-0 rounded-md" />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{s.originalFilename || `Source ${i + 1}`}</div>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      <LocationSourceBadge source={s.location?.source} place={s.location?.name} />
                      <ConfidenceBadge value={s.aiConfidence} />
                    </div>
                  </div>
                </div>
                <ol>
                  <ChainStep icon={<FileImage />} label="Source media">
                    <Link to={`/projects/${projectId}/evidence?media=${s.mediaId}`} className="font-semibold text-accent hover:underline">Open in Evidence Explorer</Link>
                    {s.observedInferred?.observed?.[0] && <p className="mt-1 text-ink-3">Observed: {s.observedInferred.observed[0]}</p>}
                  </ChainStep>
                  <ChainStep icon={<Cloud />} label="Original Cloudinary asset">
                    <MonoId value={s.publicId} />
                    {s.url && <a href={s.url} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 font-semibold text-accent hover:underline"><Link2 className="size-3.5" aria-hidden /> Original file</a>}
                  </ChainStep>
                  <ChainStep icon={<Cpu />} label="AI analysis">
                    <code className="rounded bg-surface-alt px-1.5 py-0.5 font-mono text-xs">{s.analysis?.model || 'unknown model'}</code>{' '}
                    <span className="text-ink-3">{[s.analysis?.provider, s.analysis?.version].filter(Boolean).join(' · ')}</span>
                  </ChainStep>
                  <ChainStep icon={<Clock />} label="Timestamps" last>
                    Analyzed {formatDateTime(s.analysis?.analyzedAt)} · Captured {formatDateTime(s.capturedAt)}
                  </ChainStep>
                </ol>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </Drawer>
  );
}

export default function InsightsPage() {
  const { project, projectId, canWrite } = useProject();
  const [params, setParams] = useSearchParams();
  const [kind, setKind] = useState<InsightKind | 'ALL'>('ALL');
  const query = useQuery(q.insights(projectId));
  const generate = useGenerateInsights(projectId);
  const traceId = params.get('trace');
  // Insights backed by more sources first; newest first within the same weight.
  const list = useMemo(
    () =>
      (query.data || [])
        .filter((i) => kind === 'ALL' || i.kind === kind)
        .sort((a, b) => b.evidenceMediaIds.length - a.evidenceMediaIds.length || b.generatedAt.localeCompare(a.generatedAt)),
    [query.data, kind],
  );
  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: query.data?.length || 0 };
    query.data?.forEach((i) => (c[i.kind] = (c[i.kind] || 0) + 1));
    return c;
  }, [query.data]);
  const setTrace = (id: string | null) => {
    const next = new URLSearchParams(params);
    if (id) next.set('trace', id);
    else next.delete('trace');
    setParams(next, { replace: true });
  };

  return (
    <>
      <PageHeader
        eyebrow={project.name}
        title="AI Insights"
        description="Statements generated from analyzed evidence. Each one links to the media and model output behind it."
        actions={canWrite && <Button variant="primary" leftIcon={<Sparkles />} onClick={() => generate.mutate()} isLoading={generate.isPending}>Generate insights</Button>}
      />
      <InlineAlert tone="info" icon={<Lightbulb />} className="mb-5" title="How to read these">
        <b>Observed</b> = what the model saw. <b>Inferred</b> = its interpretation. <b>Claimed</b> = statements from your project records. Confidence is the model’s certainty, not proof.
      </InlineAlert>
      {query.isPending ? (
        <div className="grid gap-3">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}</div>
      ) : query.isError ? (
        <Card><ErrorState error={query.error} onRetry={() => query.refetch()} /></Card>
      ) : !query.data.length ? (
        <Card>
          <EmptyState
            icon={<Lightbulb />}
            title="No insights yet"
            description="Generate insights to summarize what the analyzed evidence shows, with a trace back to each source."
            action={canWrite && <Button variant="primary" leftIcon={<Sparkles />} onClick={() => generate.mutate()} isLoading={generate.isPending}>Generate insights</Button>}
          />
        </Card>
      ) : (
        <>
          <div className="mb-4">
            <Segmented
              label="Filter by kind"
              value={kind}
              onChange={setKind}
              options={(['ALL', 'OBSERVED', 'INFERRED', 'CLAIMED'] as const).map((k) => ({ value: k, label: `${k === 'ALL' ? 'All' : INSIGHT_KIND_LABEL[k]} ${counts[k] || 0}` }))}
            />
          </div>
          <ul className="grid gap-3 enter-stagger">
            {list.map((i) => (
              <li key={i._id}>
                <Card className={cn('flex flex-wrap items-start gap-4 p-4 sm:flex-nowrap', i.kind === 'INFERRED' && 'border-dashed')}>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-relaxed font-medium text-ink">{i.statement}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-meta text-ink-3">
                      <TrustKindBadge kind={i.kind} />
                      <ConfidenceBadge value={i.confidence} />
                      <span>{pluralize(i.evidenceMediaIds.length, 'source')}</span>
                      {i.model && <code className="font-mono text-xs">{i.model}</code>}
                      <span>{formatDateTime(i.generatedAt)}</span>
                    </div>
                  </div>
                  <Button size="sm" leftIcon={<Link2 />} onClick={() => setTrace(i._id)}>Trace evidence</Button>
                </Card>
              </li>
            ))}
          </ul>
        </>
      )}
      <TraceDrawer insightId={traceId} onClose={() => setTrace(null)} projectId={projectId} />
    </>
  );
}
