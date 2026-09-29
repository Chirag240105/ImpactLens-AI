import { CheckCircle2, CircleDashed, Clock3, Crosshair, Loader2, MapPin, MapPinOff, Sparkles, TriangleAlert, User2 } from 'lucide-react';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Tooltip } from '@/components/ui/Misc';
import type { EvidenceType, InsightKind, LocationSource, ProcessingStatus, ProjectStatus } from '@/api/types';
import {
  EVIDENCE_TYPE_LABEL,
  INSIGHT_KIND_HINT,
  INSIGHT_KIND_LABEL,
  LOCATION_SOURCE_HINT,
  LOCATION_SOURCE_LABEL,
  PROCESSING_LABEL,
  PROJECT_STATUS_LABEL,
} from '@/lib/constants';

/** "Plantation 94%" or "AI confidence 78%": model confidence, never proof. */
export function ConfidenceBadge({ value, label, className }: { value?: number; label?: string; className?: string }) {
  if (value === undefined || value === null) return null;
  const pct = Math.round(value * 100);
  return (
    <Tooltip content="AI model confidence. It expresses how sure the model is, not whether the claim is true.">
      <Badge tone={pct >= 50 ? 'accent' : 'warning'} className={className} tabIndex={0}>
        {label ? (
          <>
            {label} <span className="tabular">{pct}%</span>
          </>
        ) : (
          <>
            AI confidence <span className="tabular">{pct}%</span>
          </>
        )}
      </Badge>
    </Tooltip>
  );
}

const SOURCE_TONE: Record<LocationSource, BadgeTone> = {
  GPS_VERIFIED: 'success',
  USER_PROVIDED: 'info',
  AI_ESTIMATED: 'estimated',
  UNKNOWN: 'neutral',
};
const SOURCE_ICON = {
  GPS_VERIFIED: <Crosshair aria-hidden />,
  USER_PROVIDED: <User2 aria-hidden />,
  AI_ESTIMATED: <CircleDashed aria-hidden />,
  UNKNOWN: <MapPinOff aria-hidden />,
} satisfies Record<LocationSource, JSX.Element>;

/** Location provenance. AI estimates are dashed so they never read as ground truth. */
export function LocationSourceBadge({ source = 'UNKNOWN', place }: { source?: LocationSource; place?: string }) {
  return (
    <Tooltip content={LOCATION_SOURCE_HINT[source]}>
      <Badge tone={SOURCE_TONE[source]} icon={SOURCE_ICON[source]} tabIndex={0}>
        {place ? `${place} · ${LOCATION_SOURCE_LABEL[source]}` : LOCATION_SOURCE_LABEL[source]}
      </Badge>
    </Tooltip>
  );
}

export function TrustKindBadge({ kind }: { kind: InsightKind }) {
  const tone = { OBSERVED: 'observed', INFERRED: 'inferred', CLAIMED: 'claimed' } as const;
  return (
    <Tooltip content={INSIGHT_KIND_HINT[kind]}>
      <Badge tone={tone[kind]} tabIndex={0}>
        {INSIGHT_KIND_LABEL[kind]}
      </Badge>
    </Tooltip>
  );
}

export function ProcessingBadge({ status, error }: { status: ProcessingStatus; error?: string }) {
  const cfg = {
    PENDING: { tone: 'neutral', icon: <Clock3 aria-hidden /> },
    PROCESSING: { tone: 'info', icon: <Loader2 className="animate-spin" aria-hidden /> },
    COMPLETED: { tone: 'success', icon: <CheckCircle2 aria-hidden /> },
    FAILED: { tone: 'error', icon: <TriangleAlert aria-hidden /> },
  } as const satisfies Record<ProcessingStatus, { tone: BadgeTone; icon: JSX.Element }>;
  const badge = (
    <Badge tone={cfg[status].tone} icon={cfg[status].icon} tabIndex={error ? 0 : undefined}>
      {PROCESSING_LABEL[status]}
    </Badge>
  );
  return error ? <Tooltip content={error}>{badge}</Tooltip> : badge;
}

export function EvidenceTypeBadge({ type }: { type: EvidenceType }) {
  const tone: Record<EvidenceType, BadgeTone> = {
    BEFORE: 'warning',
    AFTER: 'success',
    FIELD_EVIDENCE: 'neutral',
    FOLLOW_UP: 'info',
    OTHER: 'neutral',
  };
  return <Badge tone={tone[type]}>{EVIDENCE_TYPE_LABEL[type]}</Badge>;
}

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  const tone: Record<ProjectStatus, BadgeTone> = {
    DRAFT: 'neutral',
    ACTIVE: 'success',
    COMPLETED: 'info',
    ARCHIVED: 'warning',
  };
  return (
    <Badge tone={tone[status]} dot>
      {PROJECT_STATUS_LABEL[status]}
    </Badge>
  );
}

export function AiLabel({ children = 'AI-detected' }: { children?: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-label font-semibold tracking-[0.06em] text-inferred uppercase">
      <Sparkles className="size-3" aria-hidden />
      {children}
    </span>
  );
}

export function PlaceLabel({ name }: { name?: string }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1 text-meta text-ink-3">
      <MapPin className="size-3.5 shrink-0" aria-hidden />
      <span className="truncate">{name || 'Unknown location'}</span>
    </span>
  );
}
