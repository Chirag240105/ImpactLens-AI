/** API contracts mirrored from server/services/api.service.js and docs/api.md. */

export type Role = 'ADMIN' | 'PROJECT_MANAGER' | 'VIEWER';
export type ProjectStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
export type EvidenceType = 'BEFORE' | 'AFTER' | 'FIELD_EVIDENCE' | 'FOLLOW_UP' | 'OTHER';
export type ProcessingStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
export type LocationSource = 'GPS_VERIFIED' | 'USER_PROVIDED' | 'AI_ESTIMATED' | 'UNKNOWN';
export type InsightKind = 'OBSERVED' | 'INFERRED' | 'CLAIMED';

export interface ApiEnvelope<T> {
  success: true;
  data: T;
  meta: Record<string, unknown>;
}
export interface ApiErrorBody {
  success: false;
  error: { code: string; message: string; details?: Array<{ path?: string; msg?: string; message?: string }> };
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}
export interface AuthResult {
  user: User;
  token: string;
}

export interface GeoPoint {
  name?: string;
  lat?: number;
  lng?: number;
}
export interface Project {
  _id: string;
  name: string;
  description?: string;
  organization: string;
  category?: string;
  location?: GeoPoint;
  startDate?: string;
  endDate?: string;
  goals?: string[];
  status: ProjectStatus;
  expectedEvidenceCategories: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
export type ProjectInput = Partial<
  Pick<
    Project,
    | 'name'
    | 'description'
    | 'organization'
    | 'category'
    | 'location'
    | 'startDate'
    | 'endDate'
    | 'goals'
    | 'status'
    | 'expectedEvidenceCategories'
  >
>;

export interface Scored {
  name: string;
  confidence: number;
}
export interface MediaLocation extends GeoPoint {
  source: LocationSource;
}
export interface MediaAsset {
  _id: string;
  projectId: string;
  uploadedBy?: string;
  cloudinaryPublicId?: string;
  secureUrl?: string;
  thumbnailUrl?: string;
  previewUrl?: string;
  resourceType: 'image' | 'video';
  format?: string;
  bytes?: number;
  width?: number;
  height?: number;
  duration?: number;
  originalFilename?: string;
  captureDate?: string;
  uploadDate?: string;
  location?: MediaLocation;
  evidenceType: EvidenceType;
  tags?: string[];
  objects?: Scored[];
  activities?: Scored[];
  environmentalSignals?: Scored[];
  aiDescription?: string;
  aiSummary?: string;
  aiConfidence?: number;
  observedInferred?: { observed: string[]; inferred: string[] };
  processingStatus: ProcessingStatus;
  processingError?: string;
  attempts?: number;
  analysis?: { model?: string; provider?: string; version?: string; analyzedAt?: string };
  storage?: 'cloudinary' | 'local' | 'external';
  attribution?: { source?: string; title?: string; url?: string; author?: string; license?: string; licenseUrl?: string };
  createdAt: string;
  updatedAt: string;
  searchScore?: number;
  matchedTerms?: string[];
}
/** Compact media reference embedded in pairs, comparisons and timeline highlights. */
export type MediaCardRef = Pick<
  MediaAsset,
  | '_id'
  | 'thumbnailUrl'
  | 'previewUrl'
  | 'resourceType'
  | 'originalFilename'
  | 'captureDate'
  | 'evidenceType'
  | 'location'
  | 'activities'
  | 'aiConfidence'
>;

export interface MediaFilters {
  projectId?: string;
  q?: string;
  evidenceType?: EvidenceType | '';
  resourceType?: 'image' | 'video' | '';
  processingStatus?: ProcessingStatus | '';
  activity?: string;
  object?: string;
  signal?: string;
  location?: string;
  locationSource?: LocationSource | '';
  minConfidence?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}
export interface SearchResult extends Page<MediaAsset> {
  queryUnderstanding: { keywords: string[]; provider: string };
}
export interface MediaUpdate {
  evidenceType?: EvidenceType;
  captureDate?: string;
  location?: MediaLocation;
}

export interface Gap {
  type: string;
  message: string;
  suggestedAction: string;
}
export interface Coverage {
  coveragePercent: number;
  covered: string[];
  missing: string[];
  gaps: Gap[];
}
export interface ProjectDashboard {
  totalMedia: number;
  aiAnalyzed: number;
  activities: string[];
  locations: string[];
  beforeAfterPairs: number;
  evidenceCoverage: Coverage;
  environmentalSignals: string[];
}
export type ProcessingCounts = Array<{ _id: ProcessingStatus; count: number }>;

export interface TimelineMonth {
  month: string;
  label: string;
  assetCount: number;
  activities: string[];
  highlights: MediaCardRef[];
  assetIds: string[];
  evidenceTypes: Partial<Record<EvidenceType, number>>;
}
export interface LocationGroup {
  name: string;
  lat?: number;
  lng?: number;
  source: LocationSource;
  count: number;
}
export interface PairSuggestion {
  beforeId: string;
  afterId: string;
  before: MediaCardRef;
  after: MediaCardRef;
  reason: string;
}
export interface CompareResult {
  visualChangeScore: number;
  observedChanges: string[];
  inferredNotes: string[];
  confidence: number;
  analysisId: string;
  createdAt: string;
  beforeUrl?: string;
  afterUrl?: string;
  before: MediaCardRef;
  after: MediaCardRef;
  capturedBefore?: string;
  capturedAfter?: string;
}
export interface Comparison {
  _id: string;
  projectId: string;
  mediaIds: string[];
  result: Pick<CompareResult, 'visualChangeScore' | 'observedChanges' | 'inferredNotes' | 'confidence'>;
  confidence?: number;
  model?: string;
  provider?: string;
  createdAt: string;
  before?: MediaCardRef;
  after?: MediaCardRef;
}

export interface Insight {
  _id: string;
  projectId: string;
  statement: string;
  kind: InsightKind;
  evidenceMediaIds: string[];
  model?: string;
  confidence?: number;
  generatedAt: string;
}
export interface TraceSource {
  mediaId: string;
  publicId?: string;
  url?: string;
  thumbnailUrl?: string;
  previewUrl?: string;
  originalFilename?: string;
  aiConfidence?: number;
  observedInferred?: { observed: string[]; inferred: string[] };
  location?: MediaLocation;
  analysis?: MediaAsset['analysis'];
  capturedAt?: string;
}
export interface InsightTrace {
  insight: Insight;
  sources: TraceSource[];
}

export interface Overview {
  projectCount: number;
  activeProjectCount: number;
  mediaCount: number;
  analyzedCount: number;
  pendingCount: number;
  failedCount: number;
  reportCount: number;
  recentActivity: Array<{
    type: 'UPLOAD' | 'REPORT';
    projectId: string;
    projectName?: string;
    count?: number;
    reportId?: string;
    title?: string;
    isPublic?: boolean;
    at: string;
  }>;
}

export interface ReportContent {
  overview: {
    name: string;
    organization: string;
    description?: string;
    category?: string;
    location?: string;
    startDate?: string;
    endDate?: string;
  };
  kpis?: {
    totalMedia: number;
    aiAnalyzed: number;
    locations: number;
    coveragePercent: number;
    averageConfidence: number | null;
  };
  coverage?: Pick<Coverage, 'coveragePercent' | 'covered' | 'missing'>;
  objectives?: string[];
  timeline: TimelineMonth[];
  mediaGallery: Array<{
    id?: string;
    url?: string;
    thumbnailUrl?: string;
    previewUrl?: string;
    summary?: string;
    evidenceType?: EvidenceType;
    captureDate?: string;
    location?: string;
  }>;
  activities: string[];
  locationMap: LocationGroup[];
  beforeAfter: Array<Partial<PairSuggestion>>;
  aiObservations: Array<{
    kind: InsightKind;
    statement: string;
    confidence?: number;
    model?: string;
    evidenceMediaIds?: string[];
  }>;
  evidenceReferences?: Array<{ id: string; cloudinaryPublicId?: string; model?: string; timestamp?: string }>;
  evidenceGaps: Gap[];
  methodology: string;
  traceability: Array<{ assetId?: string; publicId?: string; model?: string; analyzedAt?: string }>;
  disclaimer: string;
}
export interface Report {
  _id: string;
  projectId: string;
  title: string;
  content: ReportContent;
  mediaIds: string[];
  generatedBy?: string;
  publicSlug?: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  publicUrl?: string;
}
export interface PublicReport {
  title: string;
  project: { name: string; organization: string; category?: string };
  content: ReportContent;
  publishedAt: string;
}
export interface Story {
  title: string;
  story: string;
  disclaimer: string;
}
export interface Campaign {
  socialCaption: string;
  websiteStory: string;
  executiveSummary: string;
  presentationSummary: string;
}
export interface Health {
  status: string;
  database: 'connected' | 'disconnected';
  cloudinary: 'configured' | 'misconfigured' | 'demo-mode';
  storage?: 'cloudinary' | 'local';
  aiProvider: string;
}
