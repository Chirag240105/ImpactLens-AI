import { CalendarDays } from 'lucide-react';
import type { MediaAsset } from '@/api/types';
import { cn, formatDate } from '@/lib/utils';
import { MediaThumb } from './MediaThumb';
import { ConfidenceBadge, EvidenceTypeBadge, PlaceLabel, ProcessingBadge } from './Badges';
import { IntegrityBadge } from './Integrity';
import { needsReview } from '@/lib/integrity';

/** Evidence grid card: large media first, then AI tags with confidence and provenance. */
export function MediaCard({
  asset,
  onOpen,
  selected,
}: {
  asset: MediaAsset;
  onOpen: (asset: MediaAsset) => void;
  selected?: boolean;
}) {
  const top = asset.activities?.[0];
  const title = asset.aiDescription || asset.originalFilename || 'Untitled evidence';
  return (
    <article
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-lg border border-line bg-surface transition-[border-color,box-shadow] duration-[var(--dur-fast)] ease-brand hover:border-line-hover hover:shadow-sm',
        selected && 'border-accent shadow-[0_0_0_3px_rgba(var(--accent-rgb),0.18)]',
      )}
    >
      <MediaThumb
        src={asset.thumbnailUrl}
        alt={title}
        filename={asset.originalFilename}
        isVideo={asset.resourceType === 'video'}
        videoSrc={asset.resourceType === 'video' ? asset.previewUrl : undefined}
        className="aspect-[3/2]"
        imgClassName="group-hover:scale-[1.03] transition-transform duration-[var(--dur-slow)] ease-brand"
      />
      <div className="absolute top-2 left-2 flex flex-wrap gap-1.5">
        <EvidenceTypeBadge type={asset.evidenceType} />
        {asset.processingStatus !== 'COMPLETED' && (
          <ProcessingBadge status={asset.processingStatus} error={asset.processingError} />
        )}
      </div>
      {needsReview(asset.integrity) && (
        <div className="absolute top-2 right-2 z-10">
          <IntegrityBadge integrity={asset.integrity} />
        </div>
      )}
      <div className="flex flex-1 flex-col gap-2 p-3">
        <h3 className="line-clamp-2 font-sans text-meta leading-snug font-semibold">
          {/* Stretched button makes the whole card one accessible target. */}
          <button
            type="button"
            onClick={() => onOpen(asset)}
            className="text-left after:absolute after:inset-0 after:rounded-lg focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-focus"
          >
            {title}
          </button>
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {top && <ConfidenceBadge value={top.confidence} label={top.name} />}
          {asset.matchedTerms?.length ? (
            <span className="text-label text-ink-3">matched: {asset.matchedTerms.join(', ')}</span>
          ) : asset.semanticScore !== undefined ? (
            <span className="text-label text-ink-3">related by meaning</span>
          ) : null}
        </div>
        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          <PlaceLabel name={asset.location?.name} />
          <span className="inline-flex shrink-0 items-center gap-1 text-meta text-ink-3">
            <CalendarDays className="size-3.5" aria-hidden />
            {formatDate(asset.captureDate || asset.uploadDate)}
          </span>
        </div>
      </div>
    </article>
  );
}

export function MediaCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-surface">
      <div className="skeleton aspect-[3/2]" />
      <div className="space-y-2 p-3">
        <div className="skeleton h-4 w-4/5 rounded" />
        <div className="skeleton h-5 w-24 rounded-full" />
        <div className="skeleton h-3.5 w-3/5 rounded" />
      </div>
    </div>
  );
}
