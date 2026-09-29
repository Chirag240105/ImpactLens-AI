import { useEffect } from 'react';
import { Outlet, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FolderX } from 'lucide-react';
import { q } from '@/api/queries';
import { ApiError } from '@/api/client';
import type { ProjectContext } from './useProject';
import { EmptyState, ErrorState } from '@/components/ui/Feedback';
import { ButtonLink } from '@/components/ui/Button';
import { RouteFallback } from './Loaders';
import { useCanWrite } from '@/store/auth';


export function ProjectLayout() {
  const { projectId = '' } = useParams();
  const query = useQuery(q.project(projectId));
  const canWrite = useCanWrite();
  useEffect(() => {
    if (query.data) document.title = `${query.data.name} · ImpactLens`;
    return () => {
      document.title = 'ImpactLens · Evidence workspace';
    };
  }, [query.data]);

  if (query.isPending) return <RouteFallback />;
  if (query.isError) {
    const status = query.error instanceof ApiError ? query.error.status : 0;
    if (status === 404 || status === 403 || status === 400)
      return (
        <EmptyState
          icon={<FolderX />}
          title={status === 403 ? 'You don’t have access to this project' : 'Project not found'}
          description="It may have been removed, or the link is incorrect."
          action={<ButtonLink to="/projects">Back to projects</ButtonLink>}
        />
      );
    return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  }
  return <Outlet context={{ project: query.data, projectId, canWrite } satisfies ProjectContext} />;
}

