import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Archive, Lock } from 'lucide-react';
import { useArchiveProject, useUpdateProject } from '@/api/mutations';
import { useProject } from '@/layouts/useProject';
import { PageHeader } from '@/components/ui/Misc';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/Overlay';
import { EmptyState } from '@/components/ui/Feedback';
import { ProjectForm } from './ProjectForm';

export default function ProjectSettingsPage() {
  const { project, projectId, canWrite } = useProject();
  const update = useUpdateProject(projectId);
  const archive = useArchiveProject();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);

  if (!canWrite)
    return (
      <Card>
        <EmptyState icon={<Lock />} title="Read-only access" description="Only administrators and project managers can edit project settings." />
      </Card>
    );

  return (
    <div className="max-w-3xl">
      <PageHeader eyebrow="Project" title="Project settings" description="Correct project details and the evidence categories coverage is measured against." />
      <Card>
        <CardBody>
          {/* key resets the form after a save so "dirty" tracks the new baseline */}
          <ProjectForm key={project.updatedAt} initial={project} submitLabel="Save changes" isSubmitting={update.isPending} onSubmit={(input) => update.mutate(input)} />
        </CardBody>
      </Card>
      <Card className="mt-6 border-error/40">
        <CardHeader title="Archive project" description="Archiving hides the project from active work. Media, analyses, insights and reports are preserved so evidence traces stay intact." />
        <CardBody>
          <Button variant="danger" leftIcon={<Archive />} onClick={() => setConfirming(true)} disabled={project.status === 'ARCHIVED'}>
            {project.status === 'ARCHIVED' ? 'Already archived' : 'Archive project'}
          </Button>
        </CardBody>
      </Card>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={`Archive “${project.name}”?`}
        description="The project moves to Archived. You can reactivate it later by changing its status."
        confirmLabel="Archive project"
        isLoading={archive.isPending}
        onConfirm={() =>
          archive.mutate(projectId, {
            onSuccess: () => {
              setConfirming(false);
              navigate('/projects');
            },
          })
        }
      />
    </div>
  );
}
