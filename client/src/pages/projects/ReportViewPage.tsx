import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Download, ExternalLink, FileX, Globe, Printer } from 'lucide-react';
import { q } from '@/api/queries';
import { reportsApi } from '@/api/endpoints';
import { usePublishReport } from '@/api/mutations';
import { ApiError } from '@/api/client';
import { useProject } from '@/layouts/useProject';
import { Button, buttonClass } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/Overlay';
import { CopyButton } from '@/components/ui/Misc';
import { EmptyState, ErrorState, InlineAlert, Skeleton } from '@/components/ui/Feedback';
import { ReportDocument } from '@/components/report/ReportDocument';
import { publicReportUrl } from '@/lib/utils';

export default function ReportViewPage() {
  const { reportId = '' } = useParams();
  const { projectId, canWrite } = useProject();
  const query = useQuery(q.report(reportId));
  const publish = usePublishReport(projectId);
  const [confirm, setConfirm] = useState(false);

  if (query.isPending) return <Skeleton className="h-[70vh] rounded-lg" />;
  if (query.isError)
    return query.error instanceof ApiError && query.error.status === 404 ? (
      <EmptyState icon={<FileX />} title="Report not found" action={<Link to=".." relative="path" className={buttonClass()}>Back to reports</Link>} />
    ) : (
      <Card><ErrorState error={query.error} onRetry={() => query.refetch()} /></Card>
    );

  const r = query.data;
  const url = r.publicSlug ? publicReportUrl(r.publicSlug) : '';
  return (
    <div className="mx-auto max-w-5xl">
      <div className="no-print mb-6 flex flex-wrap items-center gap-2">
        <Link to=".." relative="path" className={buttonClass('ghost', 'sm')}>
          <ArrowLeft /> All reports
        </Link>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button size="sm" leftIcon={<Printer />} onClick={() => window.print()}>Print</Button>
          <a href={reportsApi.pdfUrl(r._id)} download className={buttonClass('secondary', 'sm')}>
            <Download /> Download PDF
          </a>
          {r.isPublic && r.publicSlug ? (
            <a href={`/reports/${r.publicSlug}`} target="_blank" rel="noreferrer" className={buttonClass('primary', 'sm')}>
              <ExternalLink /> Open public page
            </a>
          ) : (
            canWrite && <Button size="sm" variant="primary" leftIcon={<Globe />} onClick={() => setConfirm(true)}>Publish</Button>
          )}
        </div>
      </div>
      {r.isPublic && url && (
        <InlineAlert tone="success" icon={<Globe />} title="Published" className="no-print mb-6" action={<CopyButton value={url} label="Copy public link" />}>
          <span className="break-all">{url}</span>
        </InlineAlert>
      )}
      <Card className="px-10 py-8 max-sm:px-5 print:border-0 print:p-0">
        <ReportDocument title={r.title} content={r.content} generatedAt={r.createdAt} />
      </Card>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        tone="primary"
        title="Publish this report?"
        description="Anyone with the link can view it without signing in. Internal user details are removed; source media thumbnails and AI observations remain visible."
        confirmLabel="Publish report"
        isLoading={publish.isPending}
        onConfirm={() => publish.mutate(r._id, { onSuccess: () => setConfirm(false) })}
      />
    </div>
  );
}
