import { useNavigate } from 'react-router-dom';
import { Dialog } from '@/components/ui/Overlay';
import { Button } from '@/components/ui/Button';
import { useCreateProject } from '@/api/mutations';
import { ProjectForm } from './ProjectForm';

export function ProjectFormDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const create = useCreateProject();
  const navigate = useNavigate();
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="New project"
      description="Set up the project, then upload field media as evidence."
      className="max-w-2xl"
    >
      {open && (
        <ProjectForm
          submitLabel="Create project"
          isSubmitting={create.isPending}
          secondary={
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          }
          onSubmit={(input) =>
            create.mutate(input, {
              onSuccess: (p) => {
                onOpenChange(false);
                navigate(`/projects/${p._id}/evidence?upload=1`);
              },
            })
          }
        />
      )}
    </Dialog>
  );
}
