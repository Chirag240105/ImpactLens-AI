import { useOutletContext } from 'react-router-dom';
import type { Project } from '@/api/types';

export interface ProjectContext {
  project: Project;
  projectId: string;
  canWrite: boolean;
}

/** Project loaded by ProjectLayout, shared with every project sub-page. */
export const useProject = () => useOutletContext<ProjectContext>();
