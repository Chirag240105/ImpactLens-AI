import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BookOpenText, Download, ExternalLink, FileText, Globe, Lock, Megaphone, Sparkles } from 'lucide-react';
import { q } from '@/api/queries';
import { reportsApi } from '@/api/endpoints';
import { useCampaign, useGenerateReport, usePublishReport, useStory } from '@/api/mutations';
import { useProject } from '@/layouts/useProject';
import { formatDateTime, publicReportUrl } from '@/lib/utils';
import { CopyButton, PageHeader } from '@/components/ui/Misc';
import { Button, buttonClass } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Field, Input } from '@/components/ui/Form';
import { Badge } from '@/components/ui/Badge';
import { EmptyState, ErrorState, InlineAlert, Skeleton } from '@/components/ui/Feedback';

function CopyBlock({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-md border border-line bg-surface-alt p-3">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-label font-semibold tracking-[0.08em] text-ink-3 uppercase">{label}</span>
        <CopyButton value={text} label={`Copy ${label.toLowerCase()}`} />
      </div>
      <p className="text-sm leading-relaxed whitespace-pre-line text-ink-2">{text}</p>
    </div>
  );
}

export default function ReportsPage() {
  const { project, projectId, canWrite } = useProject();
  const navigate = useNavigate();
  const [title, setTitle] = useState(`${project.name} — Impact Evidence Report`);
  const reports = useQuery(q.reports(projectId));
  const generate = useGenerateReport(projectId);
  const publish = usePublishReport(projectId);
  const story = useStory(projectId);
  const campaign = useCampaign(projectId);

  return (
    <>
      <PageHeader eyebrow={project.name} title="Reports" description="Turn project evidence into a traceable report, an impact story, or campaign copy." />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader eyebrow="Full report" title="Generate impact report" description="Overview, timeline, gallery, locations, before/after, AI observations, evidence gaps and a traceability table." />
          <CardBody>
            {canWrite ? (
              <form
                className="grid gap-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  generate.mutate(title.trim() || undefined, { onSuccess: (r) => navigate(r._id) });
                }}
              >
                <Field label="Report title">
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} />
                </Field>
                <Button type="submit" variant="primary" leftIcon={<FileText />} isLoading={generate.isPending} className="justify-self-start">
                  Generate report
                </Button>
              </form>
            ) : (
              <InlineAlert tone="info" icon={<Lock />}>Viewers can read existing reports. Ask a project manager to generate a new one.</InlineAlert>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader eyebrow="Storytelling" title="Impact story & campaign copy" description="AI-written drafts grounded in this project’s evidence. Review before publishing." />
          <CardBody className="grid gap-3">
            {canWrite ? (
              <div className="flex flex-wrap gap-2">
                <Button leftIcon={<BookOpenText />} onClick={() => story.mutate()} isLoading={story.isPending}>Generate impact story</Button>
                <Button leftIcon={<Megaphone />} onClick={() => campaign.mutate()} isLoading={campaign.isPending}>Generate campaign copy</Button>
              </div>
            ) : (
              <InlineAlert tone="info" icon={<Lock />}>Only managers can generate new drafts.</InlineAlert>
            )}
            {story.data && (
              <>
                <CopyBlock label="Impact story" text={story.data.story} />
                <p className="text-meta text-ink-3">{story.data.disclaimer}</p>
              </>
            )}
            {campaign.data && (
              <div className="grid gap-2">
                <CopyBlock label="Social caption" text={campaign.data.socialCaption} />
                <CopyBlock label="Website story" text={campaign.data.websiteStory} />
                <CopyBlock label="Executive summary" text={campaign.data.executiveSummary} />
                <CopyBlock label="Presentation summary" text={campaign.data.presentationSummary} />
              </div>
            )}
            {!story.data && !campaign.data && (
              <p className="flex items-center gap-2 text-meta text-ink-3"><Sparkles className="size-4 text-inferred" aria-hidden />Drafts appear here. They are AI-generated and should be verified against project records.</p>
            )}
          </CardBody>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader title="Generated reports" description="Reports are snapshots: regenerate after new evidence arrives." />
        <CardBody className="pt-3">
          {reports.isPending ? (
            <Skeleton className="h-32" />
          ) : reports.isError ? (
            <ErrorState error={reports.error} onRetry={() => reports.refetch()} compact />
          ) : !reports.data.items.length ? (
            <EmptyState icon={<FileText />} title="No reports yet" description="Generate the first report from the evidence collected so far." compact />
          ) : (
            <ul className="divide-y divide-line">
              {reports.data.items.map((r) => (
                <li key={r._id} className="flex flex-wrap items-center gap-3 py-3">
                  <span className="grid size-9 place-items-center rounded-md bg-claimed-soft text-claimed" aria-hidden><FileText className="size-4" /></span>
                  <div className="min-w-0 flex-1">
                    <Link to={r._id} className="block truncate text-sm font-semibold hover:text-accent hover:underline">{r.title}</Link>
                    <span className="text-meta text-ink-3">{formatDateTime(r.createdAt)} · {r.mediaIds.length} source assets</span>
                  </div>
                  {r.isPublic ? <Badge tone="success" icon={<Globe />}>Public</Badge> : <Badge icon={<Lock />}>Private</Badge>}
                  <div className="flex items-center gap-1">
                    <a href={reportsApi.pdfUrl(r._id)} className={buttonClass('ghost', 'sm')} download>
                      <Download /> PDF
                    </a>
                    {r.isPublic && r.publicSlug ? (
                      <>
                        <CopyButton value={publicReportUrl(r.publicSlug)} label="Copy public link" />
                        <a href={`/reports/${r.publicSlug}`} target="_blank" rel="noreferrer" className={buttonClass('ghost', 'icon-sm')} aria-label="Open public page">
                          <ExternalLink />
                        </a>
                      </>
                    ) : (
                      canWrite && (
                        <Button size="sm" variant="ghost" leftIcon={<Globe />} onClick={() => publish.mutate(r._id)} isLoading={publish.isPending && publish.variables === r._id}>
                          Publish
                        </Button>
                      )
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </>
  );
}
