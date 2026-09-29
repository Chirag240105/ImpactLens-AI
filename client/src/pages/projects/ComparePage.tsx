import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeftRight, GitCompareArrows, History, ImagePlus, Info, ScanEye, Sparkles } from 'lucide-react';
import { q } from '@/api/queries';
import { useCompare } from '@/api/mutations';
import type { CompareResult, Comparison, MediaCardRef } from '@/api/types';
import { useProject } from '@/layouts/useProject';
import { formatDate, formatDateTime, formatRelative } from '@/lib/utils';
import { PageHeader, Meter } from '@/components/ui/Misc';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { EmptyState, ErrorState, InlineAlert, Skeleton } from '@/components/ui/Feedback';
import { BeforeAfterSlider } from '@/components/evidence/BeforeAfterSlider';
import { MediaPickerDialog } from '@/components/evidence/MediaPickerDialog';
import { MediaThumb } from '@/components/evidence/MediaThumb';
import { AiLabel, PlaceLabel, TrustKindBadge } from '@/components/evidence/Badges';

type ResultView = Pick<CompareResult, 'visualChangeScore' | 'observedChanges' | 'inferredNotes' | 'confidence'> & { createdAt?: string; model?: string };

function SlotButton({ label, media, onClick }: { label: string; media?: MediaCardRef | null; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="group flex w-full items-center gap-3 rounded-lg border border-line bg-surface p-2.5 text-left transition-colors hover:border-accent focus-visible:outline-2 focus-visible:outline-focus">
      {media ? (
        <MediaThumb src={media.thumbnailUrl} alt="" filename={media.originalFilename} className="size-14 shrink-0 rounded-md" />
      ) : (
        <span className="grid size-14 shrink-0 place-items-center rounded-md border border-dashed border-line-hover bg-surface-alt text-ink-3" aria-hidden>
          <ImagePlus className="size-5" />
        </span>
      )}
      <span className="min-w-0">
        <span className="block text-label font-semibold tracking-[0.08em] text-ink-3 uppercase">{label}</span>
        <span className="block truncate text-sm font-semibold">{media ? media.location?.name || media.originalFilename : 'Choose media'}</span>
        <span className="block text-meta text-ink-3">{media ? formatDate(media.captureDate, 'Date unknown') : 'Click to pick from the project'}</span>
      </span>
    </button>
  );
}

function ResultPanel({ result }: { result: ResultView }) {
  const pct = Math.round(result.visualChangeScore * 100);
  return (
    <Card>
      <CardHeader eyebrow={<AiLabel />} title="AI-detected visual difference" description="What the model sees changing between the two captures. This is not a measurement of environmental impact." />
      <CardBody className="grid gap-5">
        <div>
          <div className="flex items-baseline justify-between">
            <span className="text-meta font-semibold text-ink-2">Visual change score</span>
            <span className="font-display text-2xl font-bold tabular">{pct}<span className="text-sm text-ink-3">/100</span></span>
          </div>
          <Meter value={result.visualChangeScore} label="Visual change score" className="mt-2 h-2" />
          <p className="mt-1.5 text-meta text-ink-3">AI confidence {Math.round((result.confidence ?? 0) * 100)}%{result.model ? ` · ${result.model}` : ''}{result.createdAt ? ` · ${formatDateTime(result.createdAt)}` : ''}</p>
        </div>
        <div>
          <div className="mb-2"><TrustKindBadge kind="OBSERVED" /></div>
          <ul className="grid gap-1.5 text-sm text-ink-2">
            {result.observedChanges?.length ? result.observedChanges.map((c) => <li key={c} className="flex gap-2"><ScanEye className="mt-0.5 size-4 shrink-0 text-observed" aria-hidden />{c}</li>) : <li className="text-ink-3">No observed changes returned.</li>}
          </ul>
        </div>
        {!!result.inferredNotes?.length && (
          <div>
            <div className="mb-2"><TrustKindBadge kind="INFERRED" /></div>
            <ul className="grid gap-1.5 text-sm text-ink-2">
              {result.inferredNotes.map((c) => <li key={c} className="flex gap-2"><Sparkles className="mt-0.5 size-4 shrink-0 text-inferred" aria-hidden />{c}</li>)}
            </ul>
          </div>
        )}
        <InlineAlert tone="info" icon={<Info />}>
          Visual AI alone can’t verify real-world outcomes. Pair this with field measurements and project records before reporting impact.
        </InlineAlert>
      </CardBody>
    </Card>
  );
}

export default function ComparePage() {
  const { project, projectId } = useProject();
  const [params, setParams] = useSearchParams();
  const beforeId = params.get('before');
  const afterId = params.get('after');
  const [picking, setPicking] = useState<'before' | 'after' | null>(null);
  const [result, setResult] = useState<ResultView | null>(null);
  const before = useQuery({ ...q.mediaDetail(beforeId || ''), enabled: Boolean(beforeId) });
  const after = useQuery({ ...q.mediaDetail(afterId || ''), enabled: Boolean(afterId) });
  const pairs = useQuery(q.pairs(projectId));
  const history = useQuery(q.comparisons(projectId));
  const compare = useCompare(projectId);

  const select = (b?: string | null, a?: string | null, stored?: Comparison) => {
    const next = new URLSearchParams(params);
    if (b) next.set('before', b);
    else next.delete('before');
    if (a) next.set('after', a);
    else next.delete('after');
    setParams(next, { replace: true });
    setResult(stored ? { ...stored.result, createdAt: stored.createdAt, model: stored.model } : null);
  };
  const run = () =>
    beforeId && afterId &&
    compare.mutate({ beforeId, afterId }, { onSuccess: (r) => setResult({ ...r, model: undefined }) });

  const bSrc = before.data?.previewUrl || before.data?.secureUrl;
  const aSrc = after.data?.previewUrl || after.data?.secureUrl;

  return (
    <>
      <PageHeader eyebrow={project.name} title="Before / After" description="Pick two captures of the same place to see what changed, as described by the AI." />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="grid content-start gap-4">
          <Card className="p-4">
            <div className="grid grid-cols-1 items-center gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto]">
              <SlotButton label="Before" media={before.data} onClick={() => setPicking('before')} />
              <Button variant="ghost" size="icon" aria-label="Swap before and after" onClick={() => select(afterId, beforeId)} disabled={!beforeId && !afterId}>
                <ArrowLeftRight />
              </Button>
              <SlotButton label="After" media={after.data} onClick={() => setPicking('after')} />
              <Button variant="primary" leftIcon={<GitCompareArrows />} onClick={run} isLoading={compare.isPending} disabled={!beforeId || !afterId || beforeId === afterId}>
                Compare
              </Button>
            </div>
          </Card>
          {beforeId && afterId ? (
            before.isPending || after.isPending ? (
              <Skeleton className="aspect-[3/2] rounded-lg" />
            ) : before.isError || after.isError ? (
              <Card><ErrorState error={before.error || after.error} onRetry={() => { before.refetch(); after.refetch(); }} /></Card>
            ) : (
              <BeforeAfterSlider
                beforeSrc={bSrc}
                afterSrc={aSrc}
                beforeLabel={`Before · ${formatDate(before.data?.captureDate, 'undated')}`}
                afterLabel={`After · ${formatDate(after.data?.captureDate, 'undated')}`}
              />
            )
          ) : (
            <Card>
              <EmptyState icon={<GitCompareArrows />} title="Choose two captures" description="Start from a suggested pair, or pick a Before and an After image yourself." />
            </Card>
          )}
          {result && <ResultPanel result={result} />}
        </div>

        <div className="grid content-start gap-4">
          <Card>
            <CardHeader title="Suggested pairs" description="Before/after captures, matched by location and time gap." />
            <CardBody className="pt-3">
              {pairs.isPending ? (
                <Skeleton className="h-48" />
              ) : pairs.isError ? (
                <ErrorState error={pairs.error} onRetry={() => pairs.refetch()} compact />
              ) : !pairs.data.length ? (
                <EmptyState title="No suggestions yet" description="Tag uploads as Before and After to get pair suggestions." compact />
              ) : (
                <ul className="scrollbar-thin grid max-h-[420px] gap-2 overflow-y-auto pr-1">
                  {pairs.data.map((p) => {
                    const active = p.beforeId === beforeId && p.afterId === afterId;
                    return (
                      <li key={`${p.beforeId}-${p.afterId}`}>
                        <button type="button" onClick={() => select(p.beforeId, p.afterId)} aria-pressed={active} className={`flex w-full items-center gap-3 rounded-md border p-2 text-left transition-colors ${active ? 'border-accent bg-accent-soft' : 'border-line hover:border-line-hover hover:bg-surface-hover'}`}>
                          <span className="flex shrink-0 -space-x-3">
                            <MediaThumb src={p.before.thumbnailUrl} alt="" className="size-12 rounded-md ring-2 ring-surface" />
                            <MediaThumb src={p.after.thumbnailUrl} alt="" className="size-12 rounded-md ring-2 ring-surface" />
                          </span>
                          <span className="min-w-0">
                            <PlaceLabel name={p.before.location?.name} />
                            <span className="block truncate text-meta text-ink-2">{p.reason}</span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Comparison history" description="Every comparison is stored with its model output." action={<History className="size-4 text-ink-3" aria-hidden />} />
            <CardBody className="pt-3">
              {history.isPending ? (
                <Skeleton className="h-32" />
              ) : history.isError ? (
                <ErrorState error={history.error} onRetry={() => history.refetch()} compact />
              ) : !history.data.length ? (
                <p className="text-meta text-ink-3">No comparisons yet.</p>
              ) : (
                <ul className="grid gap-2">
                  {history.data.slice(0, 10).map((c) => (
                    <li key={c._id}>
                      <button type="button" onClick={() => select(c.mediaIds[0], c.mediaIds[1], c)} className="flex w-full items-center gap-3 rounded-md border border-line p-2 text-left transition-colors hover:border-line-hover hover:bg-surface-hover">
                        <span className="flex shrink-0 -space-x-3">
                          <MediaThumb src={c.before?.thumbnailUrl} alt="" className="size-10 rounded-md ring-2 ring-surface" />
                          <MediaThumb src={c.after?.thumbnailUrl} alt="" className="size-10 rounded-md ring-2 ring-surface" />
                        </span>
                        <span className="min-w-0 flex-1 text-meta">
                          <span className="block font-semibold">Change score {Math.round((c.result?.visualChangeScore ?? 0) * 100)}/100</span>
                          <span className="block text-ink-3">{formatRelative(c.createdAt)} · {c.model || c.provider}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
      <MediaPickerDialog
        open={picking !== null}
        onOpenChange={(o) => !o && setPicking(null)}
        projectId={projectId}
        title={picking === 'after' ? 'Choose the “after” capture' : 'Choose the “before” capture'}
        defaultType={picking === 'after' ? 'AFTER' : 'BEFORE'}
        excludeId={picking === 'after' ? beforeId || undefined : afterId || undefined}
        onPick={(a) => (picking === 'after' ? select(beforeId, a._id) : select(a._id, afterId))}
        key={picking || 'closed'}
      />
    </>
  );
}
