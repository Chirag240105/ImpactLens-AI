import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FileSearch, Printer } from 'lucide-react';
import { q } from '@/api/queries';
import { ApiError } from '@/api/client';
import { formatDate } from '@/lib/utils';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/Button';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback';
import { ReportDocument } from '@/components/report/ReportDocument';

/** Public, no-login share page. The only L2 surface: hero reveal plus one-shot section fade-ups. */
export default function PublicReportPage() {
  const { slug = '' } = useParams();
  const query = useQuery(q.publicReport(slug));
  const r = query.data;
  useEffect(() => {
    if (r) document.title = `${r.title} · ${r.project.name}`;
  }, [r]);
  const heroImg = r?.content.mediaGallery?.find((g) => g.evidenceType === 'AFTER')?.previewUrl || r?.content.mediaGallery?.[0]?.previewUrl || r?.content.mediaGallery?.[0]?.url;

  return (
    <div className="min-h-dvh bg-bg">
      <header className="no-print sticky top-0 z-20 border-b border-line bg-bg/90 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-6 max-sm:px-4">
          <Logo />
          <div className="flex items-center gap-2">
            <span className="hidden text-meta text-ink-3 sm:inline">Shared impact report</span>
            {r && <Button size="sm" variant="ghost" leftIcon={<Printer />} onClick={() => window.print()}>Print</Button>}
          </div>
        </div>
      </header>

      {query.isPending ? (
        <div className="mx-auto grid max-w-5xl gap-4 px-6 py-10">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-40" />
        </div>
      ) : query.isError ? (
        <div className="mx-auto max-w-xl px-6 py-20">
          {query.error instanceof ApiError && query.error.status === 404 ? (
            <EmptyState icon={<FileSearch />} title="This report isn’t available" description="The link may be incorrect, or the report is no longer shared." />
          ) : (
            <ErrorState error={query.error} onRetry={() => query.refetch()} />
          )}
        </div>
      ) : r ? (
        <main>
          {/* Hero: depth-0 photo (one-time settle), depth-1 shade, depth-4 text. */}
          <section className="relative isolate overflow-hidden print:hidden">
            {heroImg && <img src={heroImg} alt="" aria-hidden className="absolute inset-0 -z-20 size-full animate-[hero-settle_1.2s_var(--ease-out)_both] object-cover" />}
            <div aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,var(--media-glass)_0%,var(--media-shade)_100%)]" />
            <div className="mx-auto max-w-5xl px-6 pt-28 pb-14 text-on-media max-sm:px-4 max-sm:pt-20">
              <div className="text-label font-semibold tracking-[0.12em] uppercase opacity-85">{r.project.organization}{r.project.category ? ` · ${r.project.category}` : ''}</div>
              <h1 className="mt-3 max-w-3xl animate-[mask-reveal_0.9s_var(--ease-out)_0.1s_both] text-[clamp(2rem,4.5vw,3.25rem)] leading-[1.05] font-extrabold tracking-[-0.03em] text-on-media">{r.project.name}</h1>
              <p className="mt-4 animate-fade-up text-base opacity-90 [animation-delay:300ms]">
                {r.title}
                {r.content.overview?.location ? ` · ${r.content.overview.location}` : ''} · Published {formatDate(r.publishedAt)}
              </p>
            </div>
          </section>
          <div className="mx-auto max-w-5xl px-6 py-10 max-sm:px-4">
            <ReportDocument title={r.title} content={r.content} generatedAt={r.publishedAt} reveal showTitle={false} />
          </div>
          <footer className="border-t border-line py-8 text-center text-meta text-ink-3">
            Generated with ImpactLens · AI observations are model output and should be verified against project records.
          </footer>
        </main>
      ) : null}
    </div>
  );
}
