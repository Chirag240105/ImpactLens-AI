import { Compass } from 'lucide-react';
import { EmptyState } from '@/components/ui/Feedback';
import { ButtonLink } from '@/components/ui/Button';

export default function NotFoundPage() {
  return (
    <EmptyState
      icon={<Compass />}
      title="Page not found"
      description="The page you’re looking for doesn’t exist or has moved."
      action={<ButtonLink to="/dashboard" variant="primary">Go to dashboard</ButtonLink>}
    />
  );
}
