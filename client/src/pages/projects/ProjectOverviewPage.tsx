import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  Camera,
  CheckCircle2,
  FileText,
  GitCompareArrows,
  ListChecks,
  MapPinned,
  ScanSearch,
  Sparkles,
  TriangleAlert,
  Upload,
} from 'lucide-react';
import { q } from '@/api/queries';
import { useAnalyzeProject } from '@/api/mutations';
import { useProject } from '@/layouts/useProject';
import { formatDate, pluralize } from '@/lib/utils';
import { PageHeader } from '@/components/ui/Misc';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { EmptyState, ErrorState, InlineAlert, Skeleton } from '@/components/ui/Feedback';
import { Badge } from '@/components/ui/Badge';
import { BarList, CoverageRing, StatCard } from '@/components/charts';
import { AiLabel, ProjectStatusBadge } from '@/components/evidence/Badges';
import { scoreTone } from '@/lib/integrity';
import { SdgList } from '@/components/Sdg';
import { INTEGRITY_FLAG_LABEL } from '@/lib/constants';
import { MediaThumb } from '@/components/evidence/MediaThumb';

function ProcessingProgress({ projectId }: { projectId: string }) {
  const { data } = useQuery(q.processing(projectId));
  if (!data) return null;
  const count = (s: string) => data.find((g) => g._id === s)?.count || 0;
  const total = data.reduce((n, g) => n + g.count, 0);
  const done = count('COMPLETED');
  const inFlight = count('PENDING') + count('PROCESSING');
  const failed = count('FAILED');
  if (!total || (!inFlight && !failed)) return null;
  const pct = Math.round((done / total) * 100);
  return (
    <Card className="mb-6 p-4" aria-live="polite">
      <div className="flex flex-wrap items-center justify-between gap-2 text-meta">
        <span className="inline-flex items-center gap-2 font-semibold">
          {inFlight ? <ScanSearch className="size-4 animate-pulse-dot text-info" aria-hidden /> : <TriangleAlert className="size-4 text-error" aria-hidden />}
          {inFlight ? `AI is analyzing ${pluralize(inFlight, 'asset')}…` : `${pluralize(failed, 'asset')} failed analysis`}
        </span>
        <span className="tabular text-ink-3">
          {done} / {total} analyzed{failed ? ` · ${failed} failed` : ''}
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-sunken" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Analysis progress">
        <div className="h-full rounded-full bg-accent transition-[width] duration-500 ease-brand-out" style={{ width: `${pct}%` }} />
      </div>
      {failed > 0 && !inFlight && (
        <p className="mt-2 text-meta text-ink-3">
          Failed assets keep their original upload. Open them in the{' '}
          <Link to="evidence?processingStatus=FAILED" className="font-semibold text-accent hover:underline">
            Evidence Explorer
          </Link>{' '}
          to retry.
        </p>
      )}
    </Card>
  );
}

export default function ProjectOverviewPage() {
  const { project, projectId, canWrite } = useProject();
  const dash = useQuery(q.dashboard(projectId));
  const sample = useQuery(q.media({ projectId, limit: 100 }));
  const analyze = useAnalyzeProject(projectId);
  const d = dash.data;

  const signals = useMemo(() => {
    const acts: Record<string, number> = {};
    const env: Record<string, number> = {};
    for (const a of sample.data?.items || []) {
      a.activities?.forEach((x) => (acts[x.name] = (acts[x.name] || 0) + 1));
      a.environmentalSignals?.forEach((x) => (env[x.name] = (env[x.name] || 0) + 1));
    }
    const toList = (m: Record<string, number>) =>
      Object.entries(m)
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6);
    return { activities: toList(acts), environment: toList(env) };
  }, [sample.data]);

  const pending = d ? d.totalMedia - d.aiAnalyzed : 0;
  const recent = sample.data?.items.slice(0, 6) || [];

  return (
    <>
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-2">
            {project.organization} <ProjectStatusBadge status={project.status} />
          </span>
        }
        title={project.name}
        description={project.description}
        actions={
          canWrite && (
            <>
              <ButtonLink to="evidence?upload=1" leftIcon={<Upload />}>
                Upload media
              </ButtonLink>
              <Button leftIcon={<Sparkles />} onClick={() => analyze.mutate()} isLoading={analyze.isPending} disabled={!d}>
                Analyze project
              </Button>
              <ButtonLink to="reports" variant="primary" leftIcon={<FileText />}>
                Generate report
              </ButtonLink>
            </>
          )
        }
      />
      <div className="-mt-3 mb-6 flex flex-wrap gap-x-5 gap-y-1 text-meta text-ink-3">
        {project.location?.name && <span>{project.location.name}</span>}
        {(project.startDate || project.endDate) && (
          <span>
            {formatDate(project.startDate)} – {formatDate(project.endDate, 'ongoing')}
          </span>
        )}
        {project.category && <span>{project.category}</span>}
      </div>

      <ProcessingProgress projectId={projectId} />

      {dash.isError ? (
        <Card>
          <ErrorState error={dash.error} onRetry={() => dash.refetch()} />
        </Card>
      ) : !d ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
      ) : d.totalMedia === 0 ? (
        <Card>
          <EmptyState
            icon={<Camera />}
            title="No evidence yet"
            description="Upload photos or videos from the field. ImpactLens analyzes each one and builds the timeline, coverage and reports from them."
            action={
              canWrite && (
                <ButtonLink to="evidence?upload=1" variant="primary" leftIcon={<Upload />}>
                  Upload the first media
                </ButtonLink>
              )
            }
          />
        </Card>
      ) : (
        <>
          <section aria-label="Project indicators" className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
            <StatCard label="Total media" value={d.totalMedia} icon={<Camera />} />
            <StatCard label="AI analyzed" value={d.aiAnalyzed} icon={<CheckCircle2 />} tone="inferred" foot={pending ? `${pending} pending` : 'All analyzed'} />
            <StatCard label="Activities" value={d.activities.length} icon={<ListChecks />} tone="info" foot="AI-detected types" />
            <StatCard label="Locations" value={d.locations.length} icon={<MapPinned />} tone="info" />
            <StatCard label="Before/after pairs" value={d.beforeAfterPairs} icon={<GitCompareArrows />} tone="warning" foot="Suggested" />
            <StatCard label="Evidence coverage" value={d.evidenceCoverage.coveragePercent} format={(n) => `${Math.round(n)}%`} icon={<ScanSearch />} foot={`${d.evidenceCoverage.covered.length} of ${d.evidenceCoverage.covered.length + d.evidenceCoverage.missing.length} categories`} />
          </section>

          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
            <Card>
              <CardHeader eyebrow="Evidence health" title="Documentation coverage" description="Expected evidence categories matched by AI-detected activities." />
              <CardBody>
                <div className="flex flex-wrap items-center gap-6">
                  <CoverageRing percent={d.evidenceCoverage.coveragePercent} />
                  <div className="min-w-0 flex-1">
                    <div className="text-label font-semibold tracking-[0.08em] text-ink-3 uppercase">Documented</div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {d.evidenceCoverage.covered.length ? d.evidenceCoverage.covered.map((c) => <Badge key={c} tone="success" icon={<CheckCircle2 />}>{c}</Badge>) : <span className="text-meta text-ink-3">None yet</span>}
                    </div>
                    {d.evidenceCoverage.missing.length > 0 && (
                      <>
                        <div className="mt-4 text-label font-semibold tracking-[0.08em] text-ink-3 uppercase">Missing</div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {d.evidenceCoverage.missing.map((c) => (
                            <Badge key={c} tone="estimated">
                              {c}
                            </Badge>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader
                eyebrow="Evidence gaps"
                title={d.evidenceCoverage.gaps.length ? `${pluralize(d.evidenceCoverage.gaps.length, 'gap')} to close` : 'No gaps detected'}
                description="What’s missing before this evidence tells a complete story."
              />
              <CardBody className="grid gap-2">
                {d.evidenceCoverage.gaps.length ? (
                  d.evidenceCoverage.gaps.map((g) => (
                    <InlineAlert key={g.type + g.message} tone="warning" icon={<TriangleAlert />} title={g.message}>
                      {g.suggestedAction}
                    </InlineAlert>
                  ))
                ) : (
                  <InlineAlert tone="success" icon={<CheckCircle2 />} title="Every expected category has evidence">
                    Keep capturing follow-up media to show change over time.
                  </InlineAlert>
                )}
              </CardBody>
            </Card>
          </div>

          {d.integrity && d.integrity.score !== null && (
            <Card className="mt-4">
              <CardHeader
                eyebrow="Anti-greenwashing"
                title="Evidence integrity"
                description="Duplicate, metadata, date and location checks across all evidence."
                action={
                  <Link to="integrity" className="inline-flex items-center gap-1 text-meta font-semibold text-accent hover:underline">
                    Review flags <ArrowRight className="size-4" aria-hidden />
                  </Link>
                }
              />
              <CardBody className="flex flex-wrap items-center gap-x-8 gap-y-4">
                <div className="flex items-center gap-3">
                  <CoverageRing percent={d.integrity.score} size={72} stroke={8} label="Integrity score" />
                  <div className="text-meta">
                    <Badge tone={scoreTone(d.integrity.score)}>{d.integrity.reviewNeeded ? `${d.integrity.reviewNeeded} to review` : 'No major issues'}</Badge>
                    <p className="mt-1 text-ink-3">{d.integrity.clean} of {d.integrity.assetsChecked} assets have no flags</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(d.integrity.byFlag)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 6)
                    .map(([code, n]) => (
                      <Badge key={code}>{INTEGRITY_FLAG_LABEL[code] || code} · {n}</Badge>
                    ))}
                </div>
              </CardBody>
            </Card>
          )}

          <Card className="mt-4">
            <CardHeader
              eyebrow="UN Sustainable Development Goals"
              title="SDG alignment"
              description="Goals the analyzed evidence shows related activity for. Alignment is not a measured contribution."
            />
            <CardBody>
              <SdgList items={d.sdgs} />
            </CardBody>
          </Card>

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader eyebrow={<AiLabel />} title="Activity signals" description="How often each AI-detected activity appears in the evidence." />
              <CardBody>{sample.isPending ? <Skeleton className="h-40" /> : <BarList items={signals.activities} valueLabel={(n) => pluralize(n, 'asset')} emptyLabel="No activities detected yet." />}</CardBody>
            </Card>
            <Card>
              <CardHeader eyebrow={<AiLabel />} title="Environmental signals" description="Visual signals the model flagged (e.g. vegetation, water). Not measurements." />
              <CardBody>{sample.isPending ? <Skeleton className="h-40" /> : <BarList items={signals.environment} valueLabel={(n) => pluralize(n, 'asset')} emptyLabel="No environmental signals detected yet." />}</CardBody>
            </Card>
          </div>

          <Card className="mt-4">
            <CardHeader
              eyebrow="Latest captures"
              title="Recent evidence"
              action={
                <Link to="evidence" className="inline-flex items-center gap-1 text-meta font-semibold text-accent hover:underline">
                  Open Evidence Explorer <ArrowRight className="size-4" aria-hidden />
                </Link>
              }
            />
            <CardBody>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {recent.map((a) => (
                  <li key={a._id}>
                    <Link to={`evidence?media=${a._id}`} className="group block overflow-hidden rounded-md border border-line focus-visible:outline-2 focus-visible:outline-focus">
                      <MediaThumb src={a.thumbnailUrl} alt={a.aiDescription || a.originalFilename || 'Evidence'} filename={a.originalFilename} isVideo={a.resourceType === 'video'} className="aspect-square" imgClassName="transition-transform duration-[var(--dur-slow)] group-hover:scale-[1.03]" />
                    </Link>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        </>
      )}
    </>
  );
}
