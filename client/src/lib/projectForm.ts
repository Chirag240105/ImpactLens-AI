import type { Project, ProjectInput, ProjectStatus } from '@/api/types';
import { DEFAULT_CATEGORIES } from './constants';
import type { ProjectFormValues } from './schemas';
import { toDateInput } from './utils';

/** Maps between the Project API shape and the flat project form. */
export const toFormValues = (p?: Project): ProjectFormValues => ({
  name: p?.name || '',
  organization: p?.organization || '',
  description: p?.description || '',
  category: p?.category || '',
  status: p?.status || 'ACTIVE',
  locationName: p?.location?.name || '',
  lat: p?.location?.lat !== undefined ? String(p.location.lat) : '',
  lng: p?.location?.lng !== undefined ? String(p.location.lng) : '',
  startDate: toDateInput(p?.startDate),
  endDate: toDateInput(p?.endDate),
  goals: (p?.goals || []).join('\n'),
  expectedEvidenceCategories: p?.expectedEvidenceCategories?.length ? p.expectedEvidenceCategories : [...DEFAULT_CATEGORIES],
});

export const toProjectInput = (v: ProjectFormValues): ProjectInput => ({
  name: v.name.trim(),
  organization: v.organization.trim(),
  description: v.description?.trim() || undefined,
  category: v.category?.trim() || undefined,
  status: v.status as ProjectStatus,
  location:
    v.locationName || v.lat
      ? { name: v.locationName || undefined, ...(v.lat !== '' ? { lat: Number(v.lat), lng: Number(v.lng) } : {}) }
      : undefined,
  startDate: v.startDate || undefined,
  endDate: v.endDate || undefined,
  goals: (v.goals || '')
    .split('\n')
    .map((g) => g.trim())
    .filter(Boolean),
  expectedEvidenceCategories: v.expectedEvidenceCategories,
});
