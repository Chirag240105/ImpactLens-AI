import type { EvidenceType, InsightKind, LocationSource, ProcessingStatus, ProjectStatus } from '@/api/types';

// Mirrors shared/constants/index.js (the server's source of truth).
export const EVIDENCE_TYPES: EvidenceType[] = ['BEFORE', 'AFTER', 'FIELD_EVIDENCE', 'FOLLOW_UP', 'OTHER'];
export const PROJECT_STATUSES: ProjectStatus[] = ['DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED'];
export const PROCESSING_STATUSES: ProcessingStatus[] = ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'];
export const LOCATION_SOURCES: LocationSource[] = ['GPS_VERIFIED', 'USER_PROVIDED', 'AI_ESTIMATED', 'UNKNOWN'];
export const DEFAULT_CATEGORIES = [
  'Site Preparation',
  'Cleaning',
  'Plantation',
  'Community Participation',
  'Infrastructure',
  'Restoration',
  'Follow-up',
];

export const EVIDENCE_TYPE_LABEL: Record<EvidenceType, string> = {
  BEFORE: 'Before',
  AFTER: 'After',
  FIELD_EVIDENCE: 'Field evidence',
  FOLLOW_UP: 'Follow-up',
  OTHER: 'Other',
};
export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  DRAFT: 'Draft',
  ACTIVE: 'Active',
  COMPLETED: 'Completed',
  ARCHIVED: 'Archived',
};
export const PROCESSING_LABEL: Record<ProcessingStatus, string> = {
  PENDING: 'Queued',
  PROCESSING: 'Analyzing',
  COMPLETED: 'Analyzed',
  FAILED: 'Analysis failed',
};
export const LOCATION_SOURCE_LABEL: Record<LocationSource, string> = {
  GPS_VERIFIED: 'GPS verified',
  USER_PROVIDED: 'User provided',
  AI_ESTIMATED: 'AI estimated',
  UNKNOWN: 'Location unknown',
};
export const LOCATION_SOURCE_HINT: Record<LocationSource, string> = {
  GPS_VERIFIED: 'Coordinates read from the photo’s embedded GPS metadata.',
  USER_PROVIDED: 'Coordinates entered by a team member at upload.',
  AI_ESTIMATED: 'Location guessed by AI from visual cues. Treat as approximate, not ground truth.',
  UNKNOWN: 'No location data is attached to this asset.',
};
export const INSIGHT_KIND_LABEL: Record<InsightKind, string> = {
  OBSERVED: 'Observed',
  INFERRED: 'Inferred',
  CLAIMED: 'Claimed',
};
export const INSIGHT_KIND_HINT: Record<InsightKind, string> = {
  OBSERVED: 'A visual description returned directly by the AI model.',
  INFERRED: 'An AI interpretation of what the evidence may show. Verify before relying on it.',
  CLAIMED: 'A statement supplied by the project team in its records.',
};

export const DEMO_ACCOUNTS = [
  { label: 'Manager', email: 'manager@impactlens.demo', password: 'Manager123!', hint: 'Create, upload, report' },
  { label: 'Admin', email: 'admin@impactlens.demo', password: 'Admin123!', hint: 'All projects' },
  { label: 'Viewer', email: 'viewer@impactlens.demo', password: 'Viewer123!', hint: 'Read-only' },
] as const;

export const ACCEPTED_MEDIA = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'image/gif': ['.gif'],
  'video/mp4': ['.mp4'],
  'video/quicktime': ['.mov'],
  'video/webm': ['.webm'],
} as const;
export const MAX_UPLOAD_FILES = 20;
export const MAX_UPLOAD_MB = Number(import.meta.env.VITE_MAX_UPLOAD_MB) || 50;

export const INTEGRITY_FLAG_LABEL: Record<string, string> = {
  DUPLICATE_EXACT: 'Exact duplicate',
  NEAR_DUPLICATE: 'Near-duplicate',
  NO_CAMERA_METADATA: 'No camera metadata',
  EDITED: 'Edited in software',
  FUTURE_DATE: 'Future capture date',
  BEFORE_PROJECT: 'Before project start',
  AFTER_PROJECT: 'After project end',
  NO_CAPTURE_DATE: 'No capture date',
  FAR_FROM_SITE: 'Far from project site',
  NO_LOCATION: 'No location',
  LOCATION_AI_ONLY: 'AI-estimated location',
  NOT_FIELD_EVIDENCE: 'Not field evidence',
};
