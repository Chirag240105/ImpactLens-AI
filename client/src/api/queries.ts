import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import { analysisApi, cleanParams, mediaApi, projectsApi, reportsApi, systemApi } from './endpoints';
import type { MediaAsset, MediaFilters, Page, ProjectStatus } from './types';

/** Hierarchical key factory: invalidating `keys.project(id)` refreshes every view of that project. */
export const keys = {
  all: ['impactlens'] as const,
  health: () => [...keys.all, 'health'] as const,
  overview: () => [...keys.all, 'overview'] as const,
  projects: () => [...keys.all, 'projects'] as const,
  projectList: (params: object) => [...keys.projects(), 'list', cleanParams(params)] as const,
  project: (id: string) => [...keys.projects(), 'detail', id] as const,
  projectPart: (id: string, part: string) => [...keys.project(id), part] as const,
  media: () => [...keys.all, 'media'] as const,
  mediaList: (filters: MediaFilters) => [...keys.media(), 'list', cleanParams(filters)] as const,
  mediaDetail: (id: string) => [...keys.media(), 'detail', id] as const,
  trace: (insightId: string) => [...keys.all, 'trace', insightId] as const,
  report: (id: string) => [...keys.all, 'report', id] as const,
  publicReport: (slug: string) => [...keys.all, 'public-report', slug] as const,
};

const IN_FLIGHT = new Set(['PENDING', 'PROCESSING']);
const POLL_MS = 2500;
const hasInFlight = (items?: MediaAsset[]) => Boolean(items?.some((a) => IN_FLIGHT.has(a.processingStatus)));

export const q = {
  health: () => queryOptions({ queryKey: keys.health(), queryFn: systemApi.health, staleTime: 30_000 }),
  overview: () => queryOptions({ queryKey: keys.overview(), queryFn: systemApi.overview }),
  projects: (params: { page?: number; limit?: number; status?: ProjectStatus | ''; search?: string }) =>
    queryOptions({
      queryKey: keys.projectList(params),
      queryFn: () => projectsApi.list(params),
      placeholderData: keepPreviousData,
    }),
  project: (id: string) => queryOptions({ queryKey: keys.project(id), queryFn: () => projectsApi.get(id) }),
  dashboard: (id: string) =>
    // Cheap aggregate that changes with every upload/analysis; always revalidate on mount.
    queryOptions({ queryKey: keys.projectPart(id, 'dashboard'), queryFn: () => projectsApi.dashboard(id), staleTime: 0 }),
  processing: (id: string) =>
    queryOptions({
      queryKey: keys.projectPart(id, 'processing'),
      queryFn: () => projectsApi.processingStatus(id),
      // Keep polling while the queue still has work, so progress stays live.
      refetchInterval: (query) =>
        query.state.data?.some((g) => IN_FLIGHT.has(g._id) && g.count > 0) ? POLL_MS : false,
    }),
  timeline: (id: string) =>
    queryOptions({ queryKey: keys.projectPart(id, 'timeline'), queryFn: () => projectsApi.timeline(id) }),
  locations: (id: string) =>
    queryOptions({ queryKey: keys.projectPart(id, 'locations'), queryFn: () => projectsApi.locations(id) }),
  coverage: (id: string) =>
    queryOptions({ queryKey: keys.projectPart(id, 'coverage'), queryFn: () => projectsApi.coverage(id) }),
  comparisons: (id: string) =>
    queryOptions({ queryKey: keys.projectPart(id, 'comparisons'), queryFn: () => projectsApi.comparisons(id) }),
  pairs: (id: string) =>
    queryOptions({ queryKey: keys.projectPart(id, 'pairs'), queryFn: () => projectsApi.pairs(id) }),
  insights: (id: string) =>
    queryOptions({ queryKey: keys.projectPart(id, 'insights'), queryFn: () => projectsApi.insights(id) }),
  reports: (id: string) =>
    queryOptions({
      queryKey: keys.projectPart(id, 'reports'),
      queryFn: () => projectsApi.reports(id, { limit: 50 }),
    }),
  /** Uses keyword search when a query is present, the plain filtered list otherwise. */
  media: (filters: MediaFilters) =>
    queryOptions({
      queryKey: keys.mediaList(filters),
      queryFn: (): Promise<Page<MediaAsset> & { queryUnderstanding?: { keywords: string[] } }> =>
        filters.q?.trim() ? mediaApi.search(filters) : mediaApi.list(filters),
      placeholderData: keepPreviousData,
      refetchInterval: (query) => (hasInFlight(query.state.data?.items) ? POLL_MS : false),
    }),
  mediaDetail: (id: string) =>
    queryOptions({
      queryKey: keys.mediaDetail(id),
      queryFn: () => mediaApi.get(id),
      refetchInterval: (query) =>
        query.state.data && IN_FLIGHT.has(query.state.data.processingStatus) ? POLL_MS : false,
    }),
  trace: (insightId: string) =>
    queryOptions({ queryKey: keys.trace(insightId), queryFn: () => analysisApi.trace(insightId) }),
  report: (id: string) => queryOptions({ queryKey: keys.report(id), queryFn: () => reportsApi.get(id) }),
  publicReport: (slug: string) =>
    queryOptions({
      queryKey: keys.publicReport(slug),
      queryFn: () => reportsApi.getPublic(slug),
      staleTime: 60_000,
    }),
};
