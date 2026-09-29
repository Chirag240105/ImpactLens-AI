import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, ChevronLeft, ChevronRight, FolderPlus, Plus, Search } from 'lucide-react';
import { q } from '@/api/queries';
import type { ProjectStatus } from '@/api/types';
import { useCanWrite } from '@/store/auth';
import { PROJECT_STATUSES, PROJECT_STATUS_LABEL } from '@/lib/constants';
import { formatDate, formatRelative } from '@/lib/utils';
import { PageHeader } from '@/components/ui/Misc';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Form';
import { Card } from '@/components/ui/Card';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback';
import { PlaceLabel, ProjectStatusBadge } from '@/components/evidence/Badges';
import { ProjectFormDialog } from './ProjectFormDialog';

const LIMIT = 12;

export default function ProjectsPage() {
  const canWrite = useCanWrite();
  // Filters live in the URL so they are shareable and survive reloads.
  const [params, setParams] = useSearchParams();
  const search = params.get('search') || '';
  const status = (params.get('status') || '') as ProjectStatus | '';
  const page = Number(params.get('page')) || 1;
  const [draft, setDraft] = useState(search);
  const [creating, setCreating] = useState(params.get('new') === '1');
  const update = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    setParams(next, { replace: true });
  };
  useEffect(() => {
    const t = setTimeout(() => draft !== search && update({ search: draft, page: '' }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  const query = useQuery(q.projects({ page, limit: LIMIT, status, search }));
  const data = query.data;
  const pages = data ? Math.max(1, Math.ceil(data.total / LIMIT)) : 1;

  return (
    <>
      <PageHeader
        eyebrow="Workspace"
        title="Projects"
        description="Each project collects field media, AI analysis, comparisons and reports."
        actions={
          canWrite && (
            <Button variant="primary" leftIcon={<Plus />} onClick={() => setCreating(true)}>
              New project
            </Button>
          )
        }
      />
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-3" aria-hidden />
          <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Search projects by name" aria-label="Search projects" className="pl-9" type="search" />
        </div>
        <div className="w-44">
          <Select value={status} onChange={(e) => update({ status: e.target.value, page: '' })} aria-label="Filter by status">
            <option value="">All statuses</option>
            {PROJECT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {PROJECT_STATUS_LABEL[s]}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {query.isPending ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-44 rounded-lg" />
          ))}
        </div>
      ) : query.isError ? (
        <Card>
          <ErrorState error={query.error} onRetry={() => query.refetch()} />
        </Card>
      ) : !data!.items.length ? (
        <Card>
          <EmptyState
            icon={<FolderPlus />}
            title={search || status ? 'No projects match these filters' : 'No projects yet'}
            description={search || status ? 'Try a different name or clear the status filter.' : 'Create your first project to start collecting evidence.'}
            action={
              search || status ? (
                <Button onClick={() => { setDraft(''); setParams({}, { replace: true }); }}>Clear filters</Button>
              ) : (
                canWrite && (
                  <Button variant="primary" onClick={() => setCreating(true)}>
                    Create a project
                  </Button>
                )
              )
            }
          />
        </Card>
      ) : (
        <>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 enter-stagger" aria-busy={query.isFetching}>
            {data!.items.map((p) => (
              <li key={p._id}>
                <Card interactive className="relative flex h-full flex-col p-5">
                  <div className="flex items-start justify-between gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-accent-soft font-display text-base font-bold text-accent" aria-hidden>
                      {p.name.charAt(0)}
                    </span>
                    <ProjectStatusBadge status={p.status} />
                  </div>
                  <h2 className="mt-4 text-base leading-snug font-bold">
                    <Link to={`/projects/${p._id}`} className="after:absolute after:inset-0 after:rounded-lg focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-focus">
                      {p.name}
                    </Link>
                  </h2>
                  <p className="mt-1 line-clamp-2 text-meta text-ink-3">{p.description || p.organization}</p>
                  <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-4">
                    <PlaceLabel name={p.location?.name} />
                    <span className="inline-flex items-center gap-1 text-meta text-ink-3">
                      <CalendarDays className="size-3.5" aria-hidden />
                      {p.startDate ? `${formatDate(p.startDate)}` : `Updated ${formatRelative(p.updatedAt)}`}
                    </span>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
          {pages > 1 && (
            <nav aria-label="Pagination" className="mt-6 flex items-center justify-between gap-3 text-meta text-ink-3">
              <span>
                Page {page} of {pages} · {data!.total} projects
              </span>
              <span className="flex gap-2">
                <Button size="sm" leftIcon={<ChevronLeft />} disabled={page <= 1} onClick={() => update({ page: String(page - 1) })}>
                  Previous
                </Button>
                <Button size="sm" disabled={page >= pages} onClick={() => update({ page: String(page + 1) })}>
                  Next <ChevronRight />
                </Button>
              </span>
            </nav>
          )}
        </>
      )}
      <ProjectFormDialog open={creating} onOpenChange={setCreating} />
    </>
  );
}
