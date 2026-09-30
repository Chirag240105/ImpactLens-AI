import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ShieldCheck, ShieldHalf } from 'lucide-react';
import { q } from '@/api/queries';
import { useProject } from '@/layouts/useProject';
import { INTEGRITY_FLAG_LABEL } from '@/lib/constants';
import { formatDate, pluralize } from '@/lib/utils';
import { PageHeader } from '@/components/ui/Misc';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState, ErrorState, InlineAlert, Skeleton } from '@/components/ui/Feedback';
import { CoverageRing } from '@/components/charts';
import { MediaThumb } from '@/components/evidence/MediaThumb';
import { IntegrityBadge, IntegrityFlags } from '@/components/evidence/Integrity';

export default function IntegrityPage() {
  const { project, projectId } = useProject();
  const query = useQuery(q.integrity(projectId));
  const r = query.data;

  return (
    <>
      <PageHeader
        eyebrow={project.name}
        title="Integrity review"
        description="Automatic checks that help keep impact claims honest: reused or near-identical photos, edited or metadata-free files, dates outside the project, and locations away from the site."
      />
      <InlineAlert tone="info" icon={<ShieldHalf />} className="mb-5" title="Signals, not verdicts">
        A flag means a person should look before the photo is used in a report. Legitimate evidence can be flagged (for example, a phone that strips GPS).
      </InlineAlert>
      {query.isPending ? (
        <Skeleton className="h-64 rounded-lg" />
      ) : query.isError ? (
        <Card><ErrorState error={query.error} onRetry={() => query.refetch()} /></Card>
      ) : !r ? null : !r.assetsChecked ? (
        <Card><EmptyState icon={<ShieldCheck />} title="Nothing to check yet" description="Upload evidence to run integrity checks." /></Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
            <Card>
              <CardHeader eyebrow="Project" title="Integrity score" description={`Average across ${pluralize(r.assetsChecked, 'asset')}.`} />
              <CardBody className="flex flex-wrap items-center gap-6">
                <CoverageRing percent={r.score ?? 0} label="Integrity score" />
                <dl className="grid gap-2 text-meta">
                  <div className="flex gap-2"><dt className="text-ink-3">No issues</dt><dd className="font-semibold">{r.clean}</dd></div>
                  <div className="flex gap-2"><dt className="text-ink-3">Needs review</dt><dd className="font-semibold text-warning">{r.reviewNeeded}</dd></div>
                  <div className="flex gap-2"><dt className="text-ink-3">Site radius</dt><dd className="font-semibold">{r.siteRadiusKm ? `${r.siteRadiusKm} km` : 'Multi-site (off)'}</dd></div>
                </dl>
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Flags by type" />
              <CardBody className="flex flex-wrap gap-2 pt-3">
                {Object.keys(r.byFlag).length ? (
                  Object.entries(r.byFlag)
                    .sort((a, b) => b[1] - a[1])
                    .map(([code, n]) => (
                      <Badge key={code} tone={/DUPLICATE|FUTURE/.test(code) ? 'error' : /EDITED|NEAR|BEFORE|NOT_FIELD|FAR/.test(code) ? 'warning' : 'neutral'}>
                        {INTEGRITY_FLAG_LABEL[code] || code} · {n}
                      </Badge>
                    ))
                ) : (
                  <span className="text-meta text-success">No flags.</span>
                )}
              </CardBody>
            </Card>
          </div>
          <Card className="mt-4">
            <CardHeader title="Flagged evidence" description="Lowest scores first." />
            <CardBody className="pt-3">
              {!r.assets.length ? (
                <p className="text-meta text-success">Every asset passed.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {r.assets.map((a) => (
                    <li key={a._id} className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-4 py-3 sm:grid-cols-[4.5rem_minmax(0,1fr)_auto]">
                      <Link to={`../evidence?media=${a._id}`} relative="path" className="block overflow-hidden rounded-md border border-line focus-visible:outline-2 focus-visible:outline-focus">
                        <MediaThumb src={a.thumbnailUrl} alt={a.originalFilename || 'Evidence'} filename={a.originalFilename} className="aspect-square" />
                      </Link>
                      <div className="min-w-0">
                        <Link to={`../evidence?media=${a._id}`} relative="path" className="block truncate text-sm font-semibold hover:text-accent hover:underline">
                          {a.originalFilename}
                        </Link>
                        <p className="mb-2 text-meta text-ink-3">{[a.location?.name, formatDate(a.captureDate, '')].filter(Boolean).join(' · ')}</p>
                        <IntegrityFlags integrity={a.integrity} />
                      </div>
                      <div className="hidden sm:block">
                        <IntegrityBadge integrity={a.integrity} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </>
      )}
    </>
  );
}
