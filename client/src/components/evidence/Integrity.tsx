import { ShieldAlert, ShieldCheck, ShieldQuestion } from 'lucide-react';
import type { AssetIntegrity, IntegrityFlag } from '@/api/types';
import { INTEGRITY_FLAG_LABEL } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { needsReview, scoreTone } from '@/lib/integrity';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Tooltip } from '@/components/ui/Misc';

const SEVERITY_TONE: Record<IntegrityFlag['severity'], BadgeTone> = { high: 'error', medium: 'warning', low: 'neutral' };


/** Compact integrity chip: "Integrity 72" with the flags in a tooltip. Signals for review, not verdicts. */
export function IntegrityBadge({ integrity, className }: { integrity?: AssetIntegrity; className?: string }) {
  if (!integrity) return null;
  const review = needsReview(integrity);
  const Icon = !integrity.flags.length ? ShieldCheck : review ? ShieldAlert : ShieldQuestion;
  return (
    <Tooltip
      content={
        integrity.flags.length ? (
          <ul className="grid gap-1">
            {integrity.flags.map((f) => (
              <li key={f.code}>• {f.message}</li>
            ))}
          </ul>
        ) : (
          'No integrity issues found.'
        )
      }
    >
      <Badge tone={review ? scoreTone(integrity.score) : integrity.flags.length ? 'neutral' : 'success'} icon={<Icon aria-hidden />} className={className} tabIndex={0}>
        {review ? 'Review' : 'Integrity'} {integrity.score}
      </Badge>
    </Tooltip>
  );
}

export function IntegrityFlags({ integrity, onOpenRelated }: { integrity?: AssetIntegrity; onOpenRelated?: (id: string) => void }) {
  if (!integrity) return <p className="text-meta text-ink-3">Integrity not checked yet.</p>;
  if (!integrity.flags.length)
    return (
      <p className="flex items-center gap-2 text-meta text-success">
        <ShieldCheck className="size-4" aria-hidden /> No duplicate, metadata, date or location issues found.
      </p>
    );
  return (
    <ul className="grid gap-2">
      {integrity.flags.map((f) => (
        <li key={f.code} className={cn('flex items-start gap-2.5 rounded-md border border-line p-2.5', f.severity === 'high' && 'border-error/40 bg-error-soft/40')}>
          <Badge tone={SEVERITY_TONE[f.severity]} className="mt-0.5 shrink-0">
            {INTEGRITY_FLAG_LABEL[f.code] || f.code}
          </Badge>
          <span className="min-w-0 text-meta text-ink-2">
            {f.message}
            {f.relatedMediaId && onOpenRelated && (
              <button type="button" onClick={() => onOpenRelated(f.relatedMediaId!)} className="ml-1 font-semibold text-accent hover:underline">
                View match
              </button>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}
