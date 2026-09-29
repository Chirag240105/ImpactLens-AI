import { useQuery } from '@tanstack/react-query';
import { Cloud, Database, Monitor, Moon, Sparkles, Sun } from 'lucide-react';
import { q } from '@/api/queries';
import { ROLE_LABEL, useAuthStore } from '@/store/auth';
import { useUiStore, type ThemePreference } from '@/store/ui';
import { initials } from '@/lib/utils';
import { PageHeader, Segmented } from '@/components/ui/Misc';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ErrorState, Skeleton } from '@/components/ui/Feedback';

const ROLE_RIGHTS = {
  ADMIN: 'Full access to every project, including creation, uploads, analysis, reports and publishing.',
  PROJECT_MANAGER: 'Create projects and manage the projects you own: upload, analyze, compare, report and publish.',
  VIEWER: 'Read-only access: browse evidence, timelines, comparisons, insights and reports.',
} as const;

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);
  const health = useQuery(q.health());

  return (
    <div className="max-w-3xl">
      <PageHeader eyebrow="Account" title="Settings" description="Your profile, appearance and the status of the services behind ImpactLens." />
      <div className="grid gap-4">
        <Card>
          <CardHeader title="Profile" />
          <CardBody className="flex flex-wrap items-center gap-4">
            <span className="grid size-14 place-items-center rounded-full bg-claimed-soft font-display text-lg font-bold text-claimed" aria-hidden>
              {initials(user?.name)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-base font-semibold">{user?.name}</div>
              <div className="text-meta text-ink-3">{user?.email}</div>
            </div>
            {user && <Badge tone="accent">{ROLE_LABEL[user.role]}</Badge>}
            {user && <p className="w-full text-meta text-ink-2">{ROLE_RIGHTS[user.role]}</p>}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Appearance" description="Applies to this browser." />
          <CardBody>
            <Segmented<ThemePreference>
              label="Theme"
              value={theme}
              onChange={setTheme}
              options={[
                { value: 'light', label: 'Light', icon: <Sun /> },
                { value: 'dark', label: 'Dark', icon: <Moon /> },
                { value: 'system', label: 'System', icon: <Monitor /> },
              ]}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Service status" description="Reported by the API health check." />
          <CardBody>
            {health.isPending ? (
              <Skeleton className="h-24" />
            ) : health.isError ? (
              <ErrorState error={health.error} onRetry={() => health.refetch()} compact />
            ) : (
              <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {[
                  { icon: <Database />, label: 'Database', value: health.data.database, ok: health.data.database === 'connected' },
                  {
                    icon: <Cloud />,
                    label: 'Media storage',
                    value:
                      health.data.cloudinary === 'configured'
                        ? 'Cloudinary'
                        : health.data.cloudinary === 'misconfigured'
                          ? 'Local (Cloudinary rejected credentials)'
                          : 'Local disk',
                    ok: health.data.cloudinary === 'configured',
                  },
                  { icon: <Sparkles />, label: 'AI provider', value: health.data.aiProvider, ok: health.data.aiProvider !== 'mock' },
                ].map((s) => (
                  <div key={s.label} className="rounded-md border border-line p-3">
                    <dt className="flex items-center gap-2 text-meta text-ink-3 [&_svg]:size-4">
                      {s.icon} {s.label}
                    </dt>
                    <dd className="mt-1.5">
                      <Badge tone={s.ok ? 'success' : 'warning'} dot>
                        {s.value}
                      </Badge>
                    </dd>
                  </div>
                ))}
              </dl>
            )}
            <p className="mt-3 text-meta text-ink-3">
              In mock mode the AI returns deterministic demonstration labels, not real computer vision. Without Cloudinary, uploads are stored on the
              API server’s disk and videos can’t be frame-analyzed. Keys are configured on the server only.
            </p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
