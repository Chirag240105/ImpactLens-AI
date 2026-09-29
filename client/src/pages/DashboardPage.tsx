import { useState } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowRight, Camera, CheckCircle2, FileText, FolderKanban, FolderPlus, Hourglass, Plus, Upload } from 'lucide-react';
import { q } from '@/api/queries';
import { useAuthStore, useCanWrite } from '@/store/auth';
import { formatNumber, formatRelative, pluralize } from '@/lib/utils';
import { PageHeader } from '@/components/ui/Misc';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback';
import { StatCard } from '@/components/charts';
import { ProjectStatusBadge, PlaceLabel } from '@/components/evidence/Badges';
import { ProjectFormDialog } from './projects/ProjectFormDialog';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const canWrite = useCanWrite();
  const [creating, setCreating] = useState(false);
  const overview = useQuery(q.overview());
  const projects = useQuery(q.projects({ limit: 6 }));
  const dashboards = useQueries({
    queries: (projects.data?.items || []).map((p) => ({ ...q.dashboard(p._id), staleTime: 60_000 })),
  });
  const o = overview.data;
  const analyzedPct = o && o.mediaCount ? Math.round((o.analyzedCount / o.mediaCount) * 100) : 0;
  const today = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());

  return (
    <>
      <PageHeader
        eyebrow={today}
        title={`${greeting()}, ${user?.name?.split(' ')[0] || 'there'}`}
        description="Here’s what’s documented across your impact projects."
        actions={
          canWrite && (
            <Button variant="primary" leftIcon={<Plus />} onClick={() => setCreating(true)}>
              New project
            </Button>
          )
        }
      />

      {overview.isError ? (
        <Card>
          <ErrorState error={overview.error} onRetry={() => overview.refetch()} compact />
        </Card>
      ) : (
        <section aria-label="Workspace summary" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {!o ? (
            Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-28 rounded-lg" />)
          ) : (
            <>
              <StatCard label="Projects" value={o.projectCount} icon={<FolderKanban />} foot={`${o.activeProjectCount} active`} />
              <StatCard label="Evidence collected" value={o.mediaCount} suffix="assets" icon={<Camera />} tone="info" foot="Photos and videos" />
              <StatCard
                label="AI analyzed"
                value={analyzedPct}
                format={(n) => `${Math.round(n)}%`}
                icon={<CheckCircle2 />}
                tone="inferred"
                foot={`${formatNumber(o.analyzedCount)} of ${formatNumber(o.mediaCount)} assets`}
              />
              <StatCard
                label="Needs attention"
                value={o.pendingCount + o.failedCount}
                icon={<Hourglass />}
                tone={o.failedCount ? 'error' : 'warning'}
                foot={`${o.pendingCount} in queue · ${o.failedCount} failed`}
              />
            </>
          )}
        </section>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader
            eyebrow="Your work"
            title="Projects"
            action={
              <Link to="/projects" className="inline-flex items-center gap-1 text-meta font-semibold text-accent hover:underline">
                View all <ArrowRight className="size-4" aria-hidden />
              </Link>
            }
          />
          <CardBody className="pt-3">
            {projects.isPending ? (
              <div className="grid gap-2">
                {Array.from({ length: 3 }, (_, i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : projects.isError ? (
              <ErrorState error={projects.error} onRetry={() => projects.refetch()} compact />
            ) : !projects.data.items.length ? (
              <EmptyState
                icon={<FolderPlus />}
                title="No projects yet"
                description={canWrite ? 'Create a project, then upload field photos and videos to start building evidence.' : 'Ask a project manager to share a project with you.'}
                action={
                  canWrite && (
                    <Button variant="primary" onClick={() => setCreating(true)}>
                      Create a project
                    </Button>
                  )
                }
                compact
              />
            ) : (
              <ul className="divide-y divide-line">
                {projects.data.items.map((p, i) => {
                  const d = dashboards[i]?.data;
                  const cov = d?.evidenceCoverage.coveragePercent;
                  return (
                    <li key={p._id}>
                      <Link to={`/projects/${p._id}`} className="-mx-2 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-md px-2 py-3 transition-colors hover:bg-surface-hover sm:grid-cols-[minmax(0,1fr)_7rem_9rem]">
                        <span className="flex min-w-0 items-center gap-3">
                          <span className="grid size-9 shrink-0 place-items-center rounded-md bg-accent-soft font-display text-sm font-bold text-accent" aria-hidden>
                            {p.name.charAt(0)}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold">{p.name}</span>
                            <PlaceLabel name={p.location?.name || p.organization} />
                          </span>
                        </span>
                        <span className="hidden sm:block">
                          <ProjectStatusBadge status={p.status} />
                        </span>
                        <span className="text-right sm:text-left">
                          <span className="block text-meta">
                            <b className="tabular">{d ? formatNumber(d.totalMedia) : '—'}</b> <span className="text-ink-3">assets</span>
                          </span>
                          <span className="mt-1 flex items-center gap-2">
                            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-sunken" aria-hidden>
                              <span className="block h-full rounded-full bg-accent" style={{ width: `${cov ?? 0}%` }} />
                            </span>
                            <span className="tabular text-label text-ink-3">{cov ?? '—'}%</span>
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader eyebrow="Latest updates" title="Recent activity" />
          <CardBody className="pt-3">
            {!o ? (
              <div className="grid gap-3">
                {Array.from({ length: 4 }, (_, i) => (
                  <Skeleton key={i} className="h-10" />
                ))}
              </div>
            ) : !o.recentActivity.length ? (
              <EmptyState icon={<Upload />} title="Nothing yet" description="Uploads and generated reports will appear here." compact />
            ) : (
              <ol className="grid gap-1">
                {o.recentActivity.map((a, i) => (
                  <li key={i}>
                    <Link
                      to={a.type === 'REPORT' ? `/projects/${a.projectId}/reports/${a.reportId}` : `/projects/${a.projectId}/evidence`}
                      className="-mx-2 flex items-start gap-3 rounded-md px-2 py-2 transition-colors hover:bg-surface-hover"
                    >
                      <span className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-full [&_svg]:size-4 ${a.type === 'REPORT' ? 'bg-claimed-soft text-claimed' : 'bg-accent-soft text-accent'}`} aria-hidden>
                        {a.type === 'REPORT' ? <FileText /> : <Upload />}
                      </span>
                      <span className="min-w-0 text-meta">
                        {a.type === 'REPORT' ? (
                          <>
                            <b className="font-semibold">{a.title}</b> generated{a.isPublic ? ' and published' : ''}
                          </>
                        ) : (
                          <>
                            <b className="font-semibold">{pluralize(a.count || 0, 'asset')}</b> added
                          </>
                        )}
                        <span className="block truncate text-ink-3">
                          {a.projectName} · {formatRelative(a.at)}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </CardBody>
        </Card>
      </div>
      <ProjectFormDialog open={creating} onOpenChange={setCreating} />
    </>
  );
}
