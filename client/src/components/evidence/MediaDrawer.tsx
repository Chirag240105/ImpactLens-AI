import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { ChevronLeft, ChevronRight, Eye, GitCompareArrows, Lightbulb, Pencil, RefreshCw, Trash2, TriangleAlert } from 'lucide-react';
import { q } from '@/api/queries';
import { useDeleteMedia, useRetryMedia, useUpdateMedia } from '@/api/mutations';
import type { EvidenceType, LocationSource, MediaAsset, Scored } from '@/api/types';
import { EVIDENCE_TYPES, EVIDENCE_TYPE_LABEL } from '@/lib/constants';
import { formatBytes, formatDate, formatDateTime, titleCase, toDateInput } from '@/lib/utils';
import { Drawer, ConfirmDialog } from '@/components/ui/Overlay';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Field, Input, Select } from '@/components/ui/Form';
import { ErrorState, InlineAlert, Skeleton } from '@/components/ui/Feedback';
import { Meter, MonoId, Tooltip } from '@/components/ui/Misc';
import { AiLabel, ConfidenceBadge, EvidenceTypeBadge, LocationSourceBadge, ProcessingBadge, TrustKindBadge } from './Badges';
import { MediaThumb } from './MediaThumb';
import { IntegrityBadge, IntegrityFlags } from './Integrity';
import { SdgChip } from '@/components/Sdg';

function Section({ title, children, aside }: { title: ReactNode; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="border-b border-line px-5 py-4 last:border-b-0">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="font-sans text-label font-semibold tracking-[0.08em] text-ink-3 uppercase">{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

function ScoreList({ items, empty }: { items?: Scored[]; empty: string }) {
  if (!items?.length) return <p className="text-meta text-ink-3">{empty}</p>;
  return (
    <ul className="grid gap-2.5">
      {items.map((s) => (
        <li key={s.name} className="grid grid-cols-[minmax(0,1fr)_6rem_2.5rem] items-center gap-3 text-meta">
          <span className="truncate font-medium text-ink-2">{titleCase(s.name)}</span>
          <Meter value={s.confidence} label={`${s.name} confidence`} />
          <span className="tabular text-right text-ink-3">{Math.round(s.confidence * 100)}%</span>
        </li>
      ))}
    </ul>
  );
}

function Meta({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[8.5rem_minmax(0,1fr)] items-baseline gap-3 py-1.5 text-meta">
      <dt className="text-ink-3">{label}</dt>
      <dd className="min-w-0 text-ink-2">{children}</dd>
    </div>
  );
}

interface EditValues {
  evidenceType: EvidenceType;
  captureDate: string;
  locationName: string;
  lat: string;
  lng: string;
}

function EditForm({ asset, onDone }: { asset: MediaAsset; onDone: () => void }) {
  const update = useUpdateMedia(asset._id, asset.projectId);
  const currentSource: LocationSource = asset.location?.source || 'UNKNOWN';
  const { register, handleSubmit } = useForm<EditValues>({
    defaultValues: {
      evidenceType: asset.evidenceType,
      captureDate: toDateInput(asset.captureDate),
      locationName: asset.location?.name || '',
      lat: asset.location?.lat !== undefined ? String(asset.location.lat) : '',
      lng: asset.location?.lng !== undefined ? String(asset.location.lng) : '',
    },
  });
  return (
    <form
      className="grid gap-3"
      onSubmit={handleSubmit((v) =>
        update.mutate(
          {
            evidenceType: v.evidenceType,
            captureDate: v.captureDate || undefined,
            location: {
              name: v.locationName || undefined,
              lat: v.lat === '' ? undefined : Number(v.lat),
              lng: v.lng === '' ? undefined : Number(v.lng),
              // A human correction is user-provided unless GPS metadata was already there.
              source:
                currentSource === 'GPS_VERIFIED' && v.lat === String(asset.location?.lat ?? '')
                  ? 'GPS_VERIFIED'
                  : v.lat !== '' || v.locationName
                    ? 'USER_PROVIDED'
                    : currentSource,
            },
          },
          { onSuccess: onDone },
        ),
      )}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Evidence type">
          <Select {...register('evidenceType')}>
            {EVIDENCE_TYPES.map((t) => (
              <option key={t} value={t}>
                {EVIDENCE_TYPE_LABEL[t]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Capture date">
          <Input type="date" {...register('captureDate')} />
        </Field>
        <Field label="Place name">
          <Input {...register('locationName')} />
        </Field>
        <div className="grid content-start gap-1.5">
          <span className="text-meta font-semibold">Current location source</span>
          <span>
            <LocationSourceBadge source={currentSource} />
          </span>
          <span className="text-meta text-ink-3">Edited coordinates are saved as user provided.</span>
        </div>
        <Field label="Latitude">
          <Input inputMode="decimal" {...register('lat')} />
        </Field>
        <Field label="Longitude">
          <Input inputMode="decimal" {...register('lng')} />
        </Field>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" isLoading={update.isPending}>
          Save correction
        </Button>
      </div>
    </form>
  );
}

export function MediaDrawer({
  mediaId,
  onClose,
  canWrite,
  onPrev,
  onNext,
  onOpenMedia,
}: {
  mediaId: string | null;
  onClose: () => void;
  canWrite: boolean;
  onPrev?: () => void;
  onNext?: () => void;
  /** Opens another asset in place (e.g. the duplicate an integrity flag points to). */
  onOpenMedia?: (id: string) => void;
}) {
  const query = useQuery({ ...q.mediaDetail(mediaId || ''), enabled: Boolean(mediaId) });
  const a = query.data;
  const retry = useRetryMedia(a?.projectId || '');
  const del = useDeleteMedia(a?.projectId || '');
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const src = a?.previewUrl || a?.secureUrl;

  return (
    <Drawer
      open={Boolean(mediaId)}
      onOpenChange={(o) => {
        if (!o) {
          setEditing(false);
          onClose();
        }
      }}
      title={a ? a.originalFilename || 'Evidence' : 'Loading evidence…'}
      description={a ? `Captured ${formatDate(a.captureDate, 'date unknown')} · ${EVIDENCE_TYPE_LABEL[a.evidenceType]}` : undefined}
      headerExtra={
        <>
          <Button variant="ghost" size="icon-sm" aria-label="Previous evidence" onClick={onPrev} disabled={!onPrev}>
            <ChevronLeft />
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label="Next evidence" onClick={onNext} disabled={!onNext}>
            <ChevronRight />
          </Button>
        </>
      }
      footer={
        a && (
          <>
            <Link to={`/projects/${a.projectId}/compare?${a.evidenceType === 'AFTER' ? 'after' : 'before'}=${a._id}`} className="inline-flex h-9 items-center gap-2 rounded-md px-3 text-meta font-semibold text-accent hover:bg-accent-soft">
              <GitCompareArrows className="size-4" aria-hidden /> Compare
            </Link>
            {canWrite && (
              <>
                <Button size="sm" leftIcon={<Pencil />} onClick={() => setEditing((e) => !e)} className="ml-auto">
                  Correct metadata
                </Button>
                <Button size="sm" variant="danger" leftIcon={<Trash2 />} onClick={() => setConfirmDelete(true)}>
                  Delete
                </Button>
              </>
            )}
          </>
        )
      }
    >
      {query.isPending && mediaId ? (
        <div className="grid gap-4 p-5">
          <Skeleton className="aspect-[3/2] rounded-lg" />
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-24" />
        </div>
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : a ? (
        <div onKeyDown={(e) => {
          if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
          if (e.key === 'ArrowLeft' && onPrev) onPrev();
          if (e.key === 'ArrowRight' && onNext) onNext();
        }}>
          <div className="bg-surface-alt">
            {a.resourceType === 'video' && src ? (
              <video src={src} controls preload="metadata" className="max-h-[50vh] w-full bg-surface-sunken" aria-label={a.aiDescription || 'Evidence video'} />
            ) : (
              <MediaThumb src={src} alt={a.aiDescription || a.originalFilename || 'Evidence'} filename={a.originalFilename} className="max-h-[50vh] min-h-56" imgClassName="max-h-[50vh] object-contain" eager />
            )}
          </div>
          {!!a.frameUrls?.length && (
            <div className="grid grid-cols-3 gap-1 bg-surface-alt px-1 pb-1" aria-label="Key frames at 10%, 50% and 90% of the video">
              {a.frameUrls.map((f, i) => (
                <MediaThumb key={f} src={f} alt={`Frame at ${['10%', '50%', '90%'][i]}`} className="aspect-video rounded" />
              ))}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-1.5 px-5 pt-4">
            <ProcessingBadge status={a.processingStatus} error={a.processingError} />
            <EvidenceTypeBadge type={a.evidenceType} />
            <LocationSourceBadge source={a.location?.source} place={a.location?.name} />
            <ConfidenceBadge value={a.aiConfidence} />
            <IntegrityBadge integrity={a.integrity} />
          </div>

          {a.processingStatus === 'FAILED' && (
            <div className="px-5 pt-4">
              <InlineAlert
                tone="error"
                icon={<TriangleAlert />}
                title="AI analysis failed"
                action={canWrite && <Button size="sm" leftIcon={<RefreshCw />} isLoading={retry.isPending} onClick={() => retry.mutate(a._id)}>Retry</Button>}
              >
                {a.processingError || 'The provider did not return a result.'} The original upload is safe.
              </InlineAlert>
            </div>
          )}
          {(a.processingStatus === 'PENDING' || a.processingStatus === 'PROCESSING') && (
            <div className="px-5 pt-4">
              <InlineAlert tone="info" title={a.processingStatus === 'PENDING' ? 'Queued for AI analysis' : 'AI is analyzing this asset…'}>
                Results will appear here automatically.
              </InlineAlert>
            </div>
          )}

          {editing && canWrite && (
            <Section title="Correct metadata">
              <EditForm asset={a} onDone={() => setEditing(false)} />
            </Section>
          )}

          {a.processingStatus === 'COMPLETED' && (
            <>
              <Section title={<AiLabel>AI description</AiLabel>}>
                <p className="text-sm leading-relaxed text-ink">{a.aiDescription || 'No description returned.'}</p>
                {a.aiSummary && <p className="mt-2 text-meta text-ink-3">{a.aiSummary}</p>}
              </Section>
              <Section title="What the AI saw vs. what it inferred">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-md border border-line p-3">
                    <div className="mb-2 flex items-center gap-2">
                      <TrustKindBadge kind="OBSERVED" />
                      <Eye className="size-4 text-observed" aria-hidden />
                    </div>
                    <ul className="grid gap-1.5 text-meta text-ink-2">
                      {(a.observedInferred?.observed || []).map((o) => <li key={o}>{o}</li>)}
                      {!a.observedInferred?.observed?.length && <li className="text-ink-3">Nothing recorded.</li>}
                    </ul>
                  </div>
                  <div className="rounded-md border border-dashed border-inferred/50 p-3">
                    <div className="mb-2 flex items-center gap-2">
                      <TrustKindBadge kind="INFERRED" />
                      <Lightbulb className="size-4 text-inferred" aria-hidden />
                    </div>
                    <ul className="grid gap-1.5 text-meta text-ink-2">
                      {(a.observedInferred?.inferred || []).map((o) => <li key={o}>{o}</li>)}
                      {!a.observedInferred?.inferred?.length && <li className="text-ink-3">Nothing recorded.</li>}
                    </ul>
                  </div>
                </div>
              </Section>
              <Section title="Activities" aside={<span className="text-label text-ink-3">AI confidence</span>}>
                <ScoreList items={a.activities} empty="No activities detected." />
              </Section>
              <Section title="Objects">
                <ScoreList items={a.objects} empty="No objects detected." />
              </Section>
              <Section title="Environmental signals">
                <ScoreList items={a.environmentalSignals} empty="No environmental signals detected." />
              </Section>
              {!!a.sdgs?.length && (
                <Section title="Aligned UN SDGs">
                  <div className="flex flex-wrap gap-1.5">
                    {a.sdgs.map((g) => (
                      <SdgChip key={g.goal} goal={g.goal} name={g.name} detail={`matched: ${g.matched.join(', ')}`} />
                    ))}
                  </div>
                </Section>
              )}
              {!!a.tags?.length && (
                <Section title="Tags">
                  <div className="flex flex-wrap gap-1.5">
                    {a.tags.map((t) => (
                      <Badge key={t}>{t}</Badge>
                    ))}
                  </div>
                </Section>
              )}
            </>
          )}

          <Section title="Integrity checks" aside={<span className="text-label text-ink-3">Signals for review, not verdicts</span>}>
            <IntegrityFlags integrity={a.integrity} onOpenRelated={onOpenMedia} />
          </Section>

          <Section title="Provenance">
            <dl>
              <Meta label={a.storage === 'local' ? 'Stored file' : 'Cloudinary asset'}>
                <MonoId value={a.cloudinaryPublicId} />
              </Meta>
              <Meta label="AI model">
                {a.analysis?.model ? (
                  <Tooltip content={`${a.analysis.provider || 'provider'} · prompt ${a.analysis.version || 'n/a'}`}>
                    <code tabIndex={0} className="rounded bg-surface-alt px-1.5 py-0.5 font-mono text-xs">{a.analysis.model}</code>
                  </Tooltip>
                ) : (
                  '—'
                )}
              </Meta>
              <Meta label="Analyzed at">{formatDateTime(a.analysis?.analyzedAt)}</Meta>
              <Meta label="Captured">{formatDateTime(a.captureDate)}</Meta>
              <Meta label="Uploaded">{formatDateTime(a.uploadDate || a.createdAt)}</Meta>
              <Meta label="Location">
                {a.location?.name || '—'}
                {a.location?.lat !== undefined && (
                  <span className="ml-1 tabular text-ink-3">
                    ({a.location.lat.toFixed(4)}, {a.location.lng?.toFixed(4)})
                  </span>
                )}
              </Meta>
              <Meta label="File">
                {[a.format?.toUpperCase(), formatBytes(a.bytes), a.width && a.height ? `${a.width}×${a.height}` : null].filter(Boolean).join(' · ') || '—'}
              </Meta>
              <Meta label="Analysis attempts">{a.attempts ?? 0}</Meta>
              {a.attribution?.url && (
                <Meta label="Source & licence">
                  <a href={a.attribution.url} target="_blank" rel="noreferrer" className="font-semibold text-accent hover:underline">
                    {a.attribution.source || 'Original'}
                  </a>
                  {a.attribution.author && <span> · {a.attribution.author}</span>}
                  {a.attribution.license && (
                    <>
                      {' · '}
                      {a.attribution.licenseUrl ? (
                        <a href={a.attribution.licenseUrl} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                          {a.attribution.license}
                        </a>
                      ) : (
                        a.attribution.license
                      )}
                    </>
                  )}
                </Meta>
              )}
            </dl>
          </Section>
        </div>
      ) : null}
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this media?"
        description="The file is removed from Cloudinary and any report that references it will lose its source link. This can’t be undone."
        confirmLabel="Delete media"
        isLoading={del.isPending}
        onConfirm={() =>
          a &&
          del.mutate(a._id, {
            onSuccess: () => {
              setConfirmDelete(false);
              onClose();
            },
          })
        }
      />
    </Drawer>
  );
}
