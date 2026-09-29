import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Grid2X2, List, Search, SearchX, SlidersHorizontal, Sparkles, Upload, X } from 'lucide-react';
import { q } from '@/api/queries';
import type { EvidenceType, LocationSource, MediaAsset, MediaFilters, ProcessingStatus } from '@/api/types';
import { useProject } from '@/layouts/useProject';
import { useUiStore } from '@/store/ui';
import {
  EVIDENCE_TYPES,
  EVIDENCE_TYPE_LABEL,
  LOCATION_SOURCES,
  LOCATION_SOURCE_LABEL,
  PROCESSING_LABEL,
  PROCESSING_STATUSES,
} from '@/lib/constants';
import { cn, formatDate, pluralize, titleCase } from '@/lib/utils';
import { PageHeader, Segmented } from '@/components/ui/Misc';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input, Select, Field } from '@/components/ui/Form';
import { Drawer } from '@/components/ui/Overlay';
import { EmptyState, ErrorState } from '@/components/ui/Feedback';
import { MediaCard, MediaCardSkeleton } from '@/components/evidence/MediaCard';
import { MediaThumb } from '@/components/evidence/MediaThumb';
import { MediaDrawer } from '@/components/evidence/MediaDrawer';
import { UploadDialog } from '@/components/evidence/UploadDialog';
import { ConfidenceBadge, EvidenceTypeBadge, LocationSourceBadge, ProcessingBadge } from '@/components/evidence/Badges';

const LIMIT = 24;
const FILTER_KEYS = ['evidenceType', 'resourceType', 'processingStatus', 'activity', 'object', 'signal', 'location', 'locationSource', 'minConfidence', 'from', 'to'] as const;
const SUGGESTIONS = ['community participation', 'plantation', 'cleaning waste', 'water', 'infrastructure'];

const chip = (on: boolean) =>
  cn(
    'touch-target inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-meta font-medium whitespace-nowrap transition-colors [&_svg]:size-3.5',
    on ? 'border-accent bg-accent-soft text-accent' : 'border-line bg-surface text-ink-2 hover:border-line-hover hover:text-ink',
  );

export default function EvidencePage() {
  const { project, projectId, canWrite } = useProject();
  const [params, setParams] = useSearchParams();
  const view = useUiStore((s) => s.mediaView);
  const setView = useUiStore((s) => s.setMediaView);
  const [showFilters, setShowFilters] = useState(false);
  const qParam = params.get('q') || '';
  const [draft, setDraft] = useState(qParam);
  useEffect(() => setDraft(qParam), [qParam]);

  const filters: MediaFilters = useMemo(() => {
    const f: MediaFilters = { projectId, q: qParam || undefined, page: Number(params.get('page')) || 1, limit: LIMIT };
    for (const k of FILTER_KEYS) {
      const v = params.get(k);
      if (v) (f as Record<string, unknown>)[k] = v;
    }
    return f;
  }, [params, projectId, qParam]);

  const setParam = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    if (!('page' in patch)) next.delete('page');
    setParams(next, { replace: true });
  };

  const query = useQuery(q.media(filters));
  const dash = useQuery(q.dashboard(projectId));
  const items = query.data?.items || [];
  const total = query.data?.total || 0;
  const pages = Math.max(1, Math.ceil(total / LIMIT));
  const page = filters.page || 1;
  const openId = params.get('media');
  const idx = items.findIndex((i) => i._id === openId);
  const activeFilters = FILTER_KEYS.filter((k) => params.get(k));
  const keywords = query.data?.queryUnderstanding?.keywords;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setParam({ q: draft.trim() || null });
  };
  const open = (a: MediaAsset) => setParam({ media: a._id, page: String(page) });
  const filterLabel = (k: (typeof FILTER_KEYS)[number], v: string) => {
    switch (k) {
      case 'evidenceType':
        return EVIDENCE_TYPE_LABEL[v as EvidenceType];
      case 'processingStatus':
        return PROCESSING_LABEL[v as ProcessingStatus];
      case 'locationSource':
        return LOCATION_SOURCE_LABEL[v as LocationSource];
      case 'minConfidence':
        return `Confidence ≥ ${Math.round(Number(v) * 100)}%`;
      case 'from':
        return `From ${formatDate(v)}`;
      case 'to':
        return `To ${formatDate(v)}`;
      case 'resourceType':
        return v === 'video' ? 'Videos' : 'Photos';
      default:
        return `${titleCase(k)}: ${v}`;
    }
  };

  const advanced = (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field label="Activity">
        <Select value={params.get('activity') || ''} onChange={(e) => setParam({ activity: e.target.value || null })}>
          <option value="">Any activity</option>
          {dash.data?.activities.map((a) => <option key={a} value={a}>{a}</option>)}
        </Select>
      </Field>
      <Field label="Location">
        <Select value={params.get('location') || ''} onChange={(e) => setParam({ location: e.target.value || null })}>
          <option value="">Any location</option>
          {dash.data?.locations.map((a) => <option key={a} value={a}>{a}</option>)}
        </Select>
      </Field>
      <Field label="Environmental signal">
        <Select value={params.get('signal') || ''} onChange={(e) => setParam({ signal: e.target.value || null })}>
          <option value="">Any signal</option>
          {dash.data?.environmentalSignals.map((a) => <option key={a} value={a}>{titleCase(a)}</option>)}
        </Select>
      </Field>
      <Field label="Object" hint="e.g. people, saplings, tools">
        <Input defaultValue={params.get('object') || ''} onBlur={(e) => setParam({ object: e.target.value.trim() || null })} onKeyDown={(e) => e.key === 'Enter' && setParam({ object: e.currentTarget.value.trim() || null })} />
      </Field>
      <Field label="Location source">
        <Select value={params.get('locationSource') || ''} onChange={(e) => setParam({ locationSource: e.target.value || null })}>
          <option value="">Any source</option>
          {LOCATION_SOURCES.map((s) => <option key={s} value={s}>{LOCATION_SOURCE_LABEL[s]}</option>)}
        </Select>
      </Field>
      <Field label="Minimum AI confidence">
        <Select value={params.get('minConfidence') || ''} onChange={(e) => setParam({ minConfidence: e.target.value || null })}>
          <option value="">Any confidence</option>
          {['0.5', '0.7', '0.8', '0.9'].map((v) => <option key={v} value={v}>{Math.round(Number(v) * 100)}% or higher</option>)}
        </Select>
      </Field>
      <Field label="Captured from">
        <Input type="date" value={params.get('from') || ''} onChange={(e) => setParam({ from: e.target.value || null })} />
      </Field>
      <Field label="Captured to">
        <Input type="date" value={params.get('to') || ''} onChange={(e) => setParam({ to: e.target.value || null })} />
      </Field>
      <Field label="Analysis status">
        <Select value={params.get('processingStatus') || ''} onChange={(e) => setParam({ processingStatus: e.target.value || null })}>
          <option value="">Any status</option>
          {PROCESSING_STATUSES.map((s) => <option key={s} value={s}>{PROCESSING_LABEL[s]}</option>)}
        </Select>
      </Field>
    </div>
  );

  return (
    <>
      <PageHeader
        eyebrow={project.name}
        title="Evidence Explorer"
        description="Search your field media in plain language, then narrow by activity, place, date or confidence."
        actions={canWrite && <Button variant="primary" leftIcon={<Upload />} onClick={() => setParam({ upload: '1' })}>Upload media</Button>}
      />

      <form role="search" onSubmit={submit} className="relative">
        <label htmlFor="evidence-q" className="sr-only">Search evidence</label>
        <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-ink-3" aria-hidden />
        <input
          id="evidence-q"
          type="search"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Show evidence of community participation…"
          className="h-12 w-full rounded-lg border border-line bg-surface pr-28 pl-12 text-sm text-ink shadow-xs placeholder:text-ink-3 focus:border-accent focus:shadow-[0_0_0_3px_rgba(var(--accent-rgb),0.16)] focus:outline-none"
        />
        <Button type="submit" variant="primary" className="absolute top-1.5 right-1.5 h-9">Search</Button>
      </form>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-meta text-ink-3">
        {keywords?.length ? (
          <span className="inline-flex items-center gap-1.5" aria-live="polite">
            <Sparkles className="size-3.5 text-inferred" aria-hidden />
            Matching {keywords.map((k) => <b key={k} className="rounded bg-inferred-soft px-1.5 py-0.5 font-semibold text-inferred">{k}</b>)} across tags, descriptions, activities and places
          </span>
        ) : (
          <>
            <span>Try:</span>
            {SUGGESTIONS.map((s) => (
              <button key={s} type="button" className="rounded-full px-2 py-0.5 font-medium text-accent hover:bg-accent-soft" onClick={() => setParam({ q: s })}>
                {s}
              </button>
            ))}
          </>
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <div className="scrollbar-thin -mx-1 flex max-w-full gap-2 overflow-x-auto px-1 py-0.5" role="group" aria-label="Evidence type">
          <button type="button" className={chip(!params.get('evidenceType'))} aria-pressed={!params.get('evidenceType')} onClick={() => setParam({ evidenceType: null })}>All</button>
          {EVIDENCE_TYPES.map((t) => (
            <button key={t} type="button" className={chip(params.get('evidenceType') === t)} aria-pressed={params.get('evidenceType') === t} onClick={() => setParam({ evidenceType: params.get('evidenceType') === t ? null : t })}>
              {EVIDENCE_TYPE_LABEL[t]}
            </button>
          ))}
          <button type="button" className={chip(params.get('resourceType') === 'video')} aria-pressed={params.get('resourceType') === 'video'} onClick={() => setParam({ resourceType: params.get('resourceType') === 'video' ? null : 'video' })}>Videos</button>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button leftIcon={<SlidersHorizontal />} onClick={() => setShowFilters(true)} aria-haspopup="dialog">
            More filters{activeFilters.length ? ` · ${activeFilters.length}` : ''}
          </Button>
          <Segmented
            label="Layout"
            value={view}
            onChange={setView}
            options={[
              { value: 'grid', label: <span className="sr-only">Grid</span>, icon: <Grid2X2 aria-hidden /> },
              { value: 'list', label: <span className="sr-only">List</span>, icon: <List aria-hidden /> },
            ]}
          />
        </div>
      </div>

      {activeFilters.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {activeFilters.map((k) => (
            <button key={k} type="button" onClick={() => setParam({ [k]: null })} className="inline-flex h-7 items-center gap-1 rounded-full bg-accent-soft px-2.5 text-meta font-medium text-accent hover:bg-accent-soft-hover" aria-label={`Remove filter ${filterLabel(k, params.get(k)!)}`}>
              {filterLabel(k, params.get(k)!)} <X className="size-3.5" aria-hidden />
            </button>
          ))}
          <button type="button" className="text-meta font-semibold text-ink-3 hover:text-ink" onClick={() => setParams(qParam ? { q: qParam } : {}, { replace: true })}>
            Clear all
          </button>
        </div>
      )}

      <div className="mt-4 mb-3 text-meta text-ink-3" aria-live="polite">
        {query.data && `${pluralize(total, 'result')}${qParam ? ` for “${qParam}”` : ''}`}
      </div>

      {query.isPending ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
          {Array.from({ length: 8 }, (_, i) => <MediaCardSkeleton key={i} />)}
        </div>
      ) : query.isError ? (
        <Card><ErrorState error={query.error} onRetry={() => query.refetch()} /></Card>
      ) : !items.length ? (
        <Card>
          <EmptyState
            icon={<SearchX />}
            title={qParam || activeFilters.length ? 'No evidence matched' : 'No evidence yet'}
            description={qParam || activeFilters.length ? 'Try broadening your filters or searching with fewer words.' : 'Upload field photos and videos to start building your evidence library.'}
            action={
              qParam || activeFilters.length ? (
                <Button onClick={() => setParams({}, { replace: true })}>Clear search and filters</Button>
              ) : (
                canWrite && <Button variant="primary" leftIcon={<Upload />} onClick={() => setParam({ upload: '1' })}>Upload media</Button>
              )
            }
          />
        </Card>
      ) : view === 'grid' ? (
        <ul className={cn('grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4 transition-opacity', query.isPlaceholderData && 'opacity-60')}>
          {items.map((a) => (
            <li key={a._id}>
              <MediaCard asset={a} onOpen={open} selected={a._id === openId} />
            </li>
          ))}
        </ul>
      ) : (
        <Card className={cn('overflow-hidden transition-opacity', query.isPlaceholderData && 'opacity-60')}>
          <ul className="divide-y divide-line">
            {items.map((a) => (
              <li key={a._id}>
                <button type="button" onClick={() => open(a)} className="grid w-full grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-surface-hover sm:grid-cols-[4.5rem_minmax(0,1fr)_auto]">
                  <MediaThumb src={a.thumbnailUrl} alt="" filename={a.originalFilename} className="aspect-square rounded-md" />
                  <span className="min-w-0">
                    <span className="block truncate text-meta font-semibold">{a.aiDescription || a.originalFilename}</span>
                    <span className="mt-1 flex flex-wrap gap-1.5">
                      <EvidenceTypeBadge type={a.evidenceType} />
                      {a.activities?.[0] && <ConfidenceBadge value={a.activities[0].confidence} label={a.activities[0].name} />}
                      <LocationSourceBadge source={a.location?.source} place={a.location?.name} />
                    </span>
                  </span>
                  <span className="hidden text-right text-meta text-ink-3 sm:block">
                    {formatDate(a.captureDate)}
                    <span className="mt-1 block">{a.processingStatus !== 'COMPLETED' && <ProcessingBadge status={a.processingStatus} />}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {pages > 1 && (
        <nav aria-label="Pagination" className="mt-6 flex items-center justify-between gap-3 text-meta text-ink-3">
          <span>Page {page} of {pages}</span>
          <span className="flex gap-2">
            <Button size="sm" leftIcon={<ChevronLeft />} disabled={page <= 1} onClick={() => setParam({ page: String(page - 1) })}>Previous</Button>
            <Button size="sm" disabled={page >= pages} onClick={() => setParam({ page: String(page + 1) })}>Next <ChevronRight /></Button>
          </span>
        </nav>
      )}

      <Drawer open={showFilters} onOpenChange={setShowFilters} title="Filter evidence" description="Filters combine with your search." className="max-w-md" footer={
        <>
          <Button variant="ghost" onClick={() => { const next = new URLSearchParams(); if (qParam) next.set('q', qParam); setParams(next, { replace: true }); }}>Reset filters</Button>
          <Button variant="primary" className="ml-auto" onClick={() => setShowFilters(false)}>Show {pluralize(total, 'result')}</Button>
        </>
      }>
        <div className="p-5">{advanced}</div>
      </Drawer>

      <MediaDrawer
        mediaId={openId}
        canWrite={canWrite}
        onClose={() => setParam({ media: null, page: String(page) })}
        onPrev={idx > 0 ? () => setParam({ media: items[idx - 1]._id, page: String(page) }) : undefined}
        onNext={idx >= 0 && idx < items.length - 1 ? () => setParam({ media: items[idx + 1]._id, page: String(page) }) : undefined}
      />
      <UploadDialog open={params.get('upload') === '1'} onOpenChange={(o) => setParam({ upload: o ? '1' : null, page: String(page) })} projectId={projectId} />
    </>
  );
}
