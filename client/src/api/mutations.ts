import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { analysisApi, mediaApi, projectsApi, reportsApi, type UploadInput } from './endpoints';
import { keys } from './queries';
import { errorMessage } from './client';
import type { MediaUpdate, ProjectInput } from './types';

const fail = (title: string) => (e: unknown) => toast.error(title, { description: errorMessage(e) });

/** Refreshes every project-scoped view plus media lists and the org overview. */
function useRefreshProject() {
  const qc = useQueryClient();
  return (projectId: string) =>
    Promise.all([
      // 'all' also refetches inactive views and cancels in-flight fetches, so a request that
      // started before the write can't repopulate the cache with pre-write data.
      qc.invalidateQueries({ queryKey: keys.project(projectId), refetchType: 'all' }),
      qc.invalidateQueries({ queryKey: keys.media() }),
      qc.invalidateQueries({ queryKey: keys.overview() }),
    ]);
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ProjectInput) => projectsApi.create(body),
    onSuccess: (p) => {
      qc.invalidateQueries({ queryKey: keys.projects() });
      qc.invalidateQueries({ queryKey: keys.overview() });
      toast.success('Project created', { description: p.name });
    },
    onError: fail('Could not create project'),
  });
}

export function useUpdateProject(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ProjectInput) => projectsApi.update(id, body),
    onSuccess: (p) => {
      qc.setQueryData(keys.project(id), p);
      qc.invalidateQueries({ queryKey: keys.projects() });
      toast.success('Project updated');
    },
    onError: fail('Could not update project'),
  });
}

export function useArchiveProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => projectsApi.archive(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.projects() });
      toast.success('Project archived', { description: 'Evidence and traces are kept.' });
    },
    onError: fail('Could not archive project'),
  });
}

export function useAnalyzeProject(id: string) {
  const refresh = useRefreshProject();
  return useMutation({
    mutationFn: () => projectsApi.analyze(id),
    onSuccess: ({ queued }) => {
      refresh(id);
      toast.success(queued ? `Analyzing ${queued} asset${queued === 1 ? '' : 's'}` : 'Everything is already analyzed');
    },
    onError: fail('Could not start analysis'),
  });
}

export function useUploadMedia() {
  const refresh = useRefreshProject();
  return useMutation({
    mutationFn: ({ input, onProgress }: { input: UploadInput; onProgress?: (pct: number) => void }) =>
      mediaApi.upload(input, onProgress),
    onSuccess: (assets, { input }) => {
      refresh(input.projectId);
      toast.success(`${assets.length} file${assets.length === 1 ? '' : 's'} uploaded`, {
        description: 'AI analysis is running in the background.',
      });
    },
    onError: fail('Upload failed'),
  });
}

export function useUpdateMedia(id: string, projectId: string) {
  const qc = useQueryClient();
  const refresh = useRefreshProject();
  return useMutation({
    mutationFn: (body: MediaUpdate) => mediaApi.update(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.mediaDetail(id) });
      refresh(projectId);
      toast.success('Metadata corrected');
    },
    onError: fail('Could not save changes'),
  });
}

export function useDeleteMedia(projectId: string) {
  const qc = useQueryClient();
  const refresh = useRefreshProject();
  return useMutation({
    mutationFn: (id: string) => mediaApi.remove(id),
    onSuccess: ({ id }) => {
      qc.removeQueries({ queryKey: keys.mediaDetail(id) });
      refresh(projectId);
      toast.success('Media deleted');
    },
    onError: fail('Could not delete media'),
  });
}

export function useRetryMedia(projectId: string) {
  const qc = useQueryClient();
  const refresh = useRefreshProject();
  return useMutation({
    mutationFn: (id: string) => mediaApi.retry(id),
    onSuccess: (a) => {
      qc.setQueryData(keys.mediaDetail(a._id), (old: object | undefined) => ({ ...old, ...a }));
      refresh(projectId);
      toast.success('Analysis re-queued');
    },
    onError: fail('Could not retry analysis'),
  });
}

export function useCompare(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ beforeId, afterId }: { beforeId: string; afterId: string }) =>
      analysisApi.compare(beforeId, afterId),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.projectPart(projectId, 'comparisons') }),
    onError: fail('Comparison failed'),
  });
}

export function useGenerateInsights(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => projectsApi.generateInsights(projectId),
    onSuccess: (docs) => {
      qc.invalidateQueries({ queryKey: keys.projectPart(projectId, 'insights') });
      toast.success(docs.length ? `${docs.length} new insight${docs.length === 1 ? '' : 's'}` : 'Insights are up to date');
    },
    onError: fail('Could not generate insights'),
  });
}

export function useGenerateReport(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (title?: string) => reportsApi.generate({ projectId, title }),
    onSuccess: (r) => {
      qc.setQueryData(keys.report(r._id), r);
      qc.invalidateQueries({ queryKey: keys.projectPart(projectId, 'reports') });
      qc.invalidateQueries({ queryKey: keys.overview() });
      toast.success('Report generated');
    },
    onError: fail('Could not generate report'),
  });
}

export function usePublishReport(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => reportsApi.publish(id),
    onSuccess: (r) => {
      qc.setQueryData(keys.report(r._id), (old: object | undefined) => ({ ...old, ...r }));
      qc.invalidateQueries({ queryKey: keys.projectPart(projectId, 'reports') });
      toast.success('Report published', { description: 'Anyone with the link can view it.' });
    },
    onError: fail('Could not publish report'),
  });
}

export const useStory = (projectId: string) =>
  useMutation({ mutationFn: () => reportsApi.story(projectId), onError: fail('Could not generate story') });
export const useCampaign = (projectId: string) =>
  useMutation({ mutationFn: () => reportsApi.campaign(projectId), onError: fail('Could not generate campaign copy') });
