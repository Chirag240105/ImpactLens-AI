import type { AssetIntegrity } from '@/api/types';
import type { BadgeTone } from '@/components/ui/Badge';

/** Medium/high flags mean a person should look before the asset is reported. */
export const needsReview = (i?: AssetIntegrity) => Boolean(i?.flags.some((f) => f.severity !== 'low'));

export function scoreTone(score?: number | null): BadgeTone {
  if (score === undefined || score === null) return 'neutral';
  return score >= 85 ? 'success' : score >= 60 ? 'warning' : 'error';
}
