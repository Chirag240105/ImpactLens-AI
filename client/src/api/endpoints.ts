import { http, unwrap, API_BASE_URL } from './client';
import type {
  AuthResult,
  Campaign,
  CompareResult,
  Comparison,
  Coverage,
  EvidenceType,
  Health,
  Insight,
  InsightTrace,
  IntegrityReport,
  LocationGroup,
  MediaAsset,
  MediaFilters,
  MediaUpdate,
  Overview,
  Page,
  PairSuggestion,
  ProcessingCounts,
  Project,
  ProjectDashboard,
  ProjectInput,
  ProjectStatus,
  PublicReport,
  Report,
  SearchResult,
  Story,
  TimelineMonth,
  User,
} from './types';

/** Drops empty filter values so query keys and URLs stay minimal. */
export const cleanParams = <T extends object>(params: T): Partial<T> =>
  Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
  ) as Partial<T>;

export const authApi = {
  login: (body: { email: string; password: string }) => unwrap<AuthResult>(http.post('/auth/login', body)),
  register: (body: { name: string; email: string; password: string }) =>
    unwrap<AuthResult>(http.post('/auth/register', body)),
  me: () => unwrap<User>(http.get('/auth/me')),
  logout: () => unwrap<{ loggedOut: boolean }>(http.post('/auth/logout')),
};

export const systemApi = {
  health: () => unwrap<Health>(http.get('/health')),
  overview: () => unwrap<Overview>(http.get('/dashboard/overview')),
};

export const projectsApi = {
  list: (params: { page?: number; limit?: number; status?: ProjectStatus | ''; search?: string }) =>
    unwrap<Page<Project>>(http.get('/projects', { params: cleanParams(params) })),
  get: (id: string) => unwrap<Project>(http.get(`/projects/${id}`)),
  create: (body: ProjectInput) => unwrap<Project>(http.post('/projects', body)),
  update: (id: string, body: ProjectInput) => unwrap<Project>(http.patch(`/projects/${id}`, body)),
  archive: (id: string) => unwrap<Project>(http.delete(`/projects/${id}`)),
  analyze: (id: string) => unwrap<{ queued: number }>(http.post(`/projects/${id}/analyze`)),
  processingStatus: (id: string) => unwrap<ProcessingCounts>(http.get(`/projects/${id}/processing-status`)),
  dashboard: (id: string) => unwrap<ProjectDashboard>(http.get(`/projects/${id}/dashboard`)),
  timeline: (id: string) => unwrap<TimelineMonth[]>(http.get(`/projects/${id}/timeline`)),
  locations: (id: string) => unwrap<LocationGroup[]>(http.get(`/projects/${id}/locations`)),
  coverage: (id: string) => unwrap<Coverage>(http.get(`/projects/${id}/coverage`)),
  integrity: (id: string) => unwrap<IntegrityReport>(http.get(`/projects/${id}/integrity`)),
  comparisons: (id: string) => unwrap<Comparison[]>(http.get(`/projects/${id}/comparisons`)),
  pairs: (id: string) => unwrap<PairSuggestion[]>(http.get(`/projects/${id}/pair-suggestions`)),
  insights: (id: string) => unwrap<Insight[]>(http.get(`/projects/${id}/insights`)),
  generateInsights: (id: string) => unwrap<Insight[]>(http.post(`/projects/${id}/insights/generate`)),
  reports: (id: string, params: { page?: number; limit?: number } = {}) =>
    unwrap<Page<Report>>(http.get(`/projects/${id}/reports`, { params })),
};

export interface UploadInput {
  projectId: string;
  files: File[];
  evidenceType?: EvidenceType;
  captureDate?: string;
  location?: { lat: number; lng: number; name?: string };
}

export const mediaApi = {
  list: (filters: MediaFilters) => unwrap<Page<MediaAsset>>(http.get('/media', { params: cleanParams(filters) })),
  search: (filters: MediaFilters) => unwrap<SearchResult>(http.get('/search', { params: cleanParams(filters) })),
  get: (id: string) => unwrap<MediaAsset>(http.get(`/media/${id}`)),
  update: (id: string, body: MediaUpdate) => unwrap<MediaAsset>(http.patch(`/media/${id}`, body)),
  remove: (id: string) => unwrap<{ id: string }>(http.delete(`/media/${id}`)),
  retry: (id: string) => unwrap<MediaAsset>(http.post(`/media/${id}/analyze`)),
  upload: ({ projectId, files, evidenceType, captureDate, location }: UploadInput, onProgress?: (pct: number) => void) => {
    const form = new FormData();
    form.append('projectId', projectId);
    if (evidenceType) form.append('evidenceType', evidenceType);
    if (captureDate) form.append('captureDate', captureDate);
    if (location) form.append('location', JSON.stringify(location));
    files.forEach((f) => form.append('files', f));
    return unwrap<MediaAsset[]>(
      http.post('/media/upload', form, {
        timeout: 10 * 60_000,
        onUploadProgress: (e) => e.total && onProgress?.(Math.round((e.loaded / e.total) * 100)),
      }),
    );
  },
};

export const analysisApi = {
  compare: (beforeId: string, afterId: string) =>
    unwrap<CompareResult>(http.post('/analysis/compare', { beforeId, afterId })),
  trace: (insightId: string) => unwrap<InsightTrace>(http.get(`/insights/${insightId}/trace`)),
};

export const reportsApi = {
  generate: (body: { projectId: string; title?: string }) => unwrap<Report>(http.post('/reports/generate', body)),
  story: (projectId: string) => unwrap<Story>(http.post('/reports/story', { projectId })),
  campaign: (projectId: string) => unwrap<Campaign>(http.post('/reports/campaign', { projectId })),
  get: (id: string) => unwrap<Report>(http.get(`/reports/${id}`)),
  publish: (id: string) => unwrap<Report>(http.patch(`/reports/${id}/publish`, {})),
  getPublic: (slug: string) => unwrap<PublicReport>(http.get(`/reports/public/${slug}`)),
  pdfUrl: (id: string) => `${API_BASE_URL}/reports/${id}/pdf`,
};
