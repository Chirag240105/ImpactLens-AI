import { useState, type ReactNode } from 'react';
import { CalendarRange, Camera, CheckCircle2, ListChecks, MapPin, ShieldAlert, TriangleAlert } from 'lucide-react';
import type { InsightKind, LocationSource, ReportContent } from '@/api/types';
import { EVIDENCE_TYPE_LABEL } from '@/lib/constants';
import { formatDate, formatDateTime, pluralize } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { CoverageRing, BarList } from '@/components/charts';
import { MediaThumb } from '@/components/evidence/MediaThumb';
import { BeforeAfterSlider } from '@/components/evidence/BeforeAfterSlider';
import { AiLabel, LocationSourceBadge, TrustKindBadge } from '@/components/evidence/Badges';
import { Reveal } from './Reveal';

function Block({ id, eyebrow, title, children, reveal }: { id: string; eyebrow?: ReactNode; title: string; children: ReactNode; reveal?: boolean }) {
  const body = (
    <>
      <div className="mb-4">
        {eyebrow && <div className="mb-1 text-label font-semibold tracking-[0.08em] text-ink-3 uppercase">{eyebrow}</div>}
        <h2 className="text-xl font-bold tracking-[-0.01em]">{title}</h2>
      </div>
      {children}
    </>
  );
  const cls = 'break-inside-avoid border-t border-line py-8 print:py-5';
  return reveal ? (
    <Reveal id={id} className={cls}>
      {body}
    </Reveal>
  ) : (
    <section id={id} className={cls}>
      {body}
    </section>
  );
}

/**
 * Renders a stored report's structured content. Shared by the authenticated report viewer and the
 * public share page (which passes `reveal` for its L2 scroll reveals).
 */
export function ReportDocument({
  title,
  content: c,
  generatedAt,
  reveal = false,
  showTitle = true,
}: {
  title: string;
  content: ReportContent;
  generatedAt?: string;
  reveal?: boolean;
  /** The public page renders the title in its hero instead. */
  showTitle?: boolean;
}) {
  const [galleryAll, setGalleryAll] = useState(false);
  const gallery = c.mediaGallery || [];
  const shown = galleryAll ? gallery : gallery.slice(0, 12);
  const pair = c.beforeAfter?.find((p) => p.before && p.after);
  const kpis = c.kpis;
  const timelineMax = Math.max(1, ...(c.timeline || []).map((t) => t.assetCount));

  return (
    <article className="text-ink">
      <header className="pb-8">
        {showTitle && (
          <>
            <div className="text-label font-semibold tracking-[0.1em] text-accent uppercase">Impact evidence report</div>
            <h1 className="mt-2 text-[clamp(1.75rem,3.5vw,2.5rem)] leading-[1.1] font-extrabold tracking-[-0.03em]">{title}</h1>
            <p className="mt-3 text-base text-ink-2">
              {[c.overview?.name, c.overview?.organization, c.overview?.location].filter(Boolean).join(' · ')}
            </p>
          </>
        )}
        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-meta text-ink-3">
          {(c.overview?.startDate || c.overview?.endDate) && (
            <span className="inline-flex items-center gap-1.5"><CalendarRange className="size-4" aria-hidden />{formatDate(c.overview.startDate)} – {formatDate(c.overview.endDate, 'ongoing')}</span>
          )}
          {generatedAt && <span>Generated {formatDateTime(generatedAt)}</span>}
        </div>
        {c.overview?.description && <p className="mt-5 max-w-3xl text-[0.9375rem] leading-relaxed text-ink-2">{c.overview.description}</p>}
      </header>

      {kpis && (
        <section aria-label="Key figures" className="grid grid-cols-2 gap-3 pb-8 md:grid-cols-4">
          {[
            { label: 'Media assets', value: kpis.totalMedia },
            { label: 'AI analyzed', value: kpis.aiAnalyzed },
            { label: 'Locations', value: kpis.locations },
            { label: 'Evidence coverage', value: `${kpis.coveragePercent}%` },
          ].map((k) => (
            <div key={k.label} className="rounded-lg border border-line bg-surface p-4">
              <div className="font-display text-2xl font-bold tabular">{k.value}</div>
              <div className="mt-1 text-meta text-ink-3">{k.label}</div>
            </div>
          ))}
        </section>
      )}

      {!!c.objectives?.length && (
        <Block id="objectives" title="Objectives" reveal={reveal}>
          <ul className="grid gap-2">
            {c.objectives.map((o) => (
              <li key={o} className="flex gap-2 text-[0.9375rem] text-ink-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />{o}</li>
            ))}
          </ul>
        </Block>
      )}

      <Block id="coverage" eyebrow="Evidence health" title="What is documented" reveal={reveal}>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-[auto_minmax(0,1fr)]">
          {c.coverage && <CoverageRing percent={c.coverage.coveragePercent} size={104} />}
          <div className="grid gap-4">
            <div>
              <div className="mb-2"><AiLabel>AI-detected activities</AiLabel></div>
              <div className="flex flex-wrap gap-1.5">{(c.activities || []).map((a) => <Badge key={a} tone="accent">{a}</Badge>)}</div>
            </div>
            {!!c.coverage?.missing?.length && (
              <div>
                <div className="mb-2 text-label font-semibold tracking-[0.08em] text-ink-3 uppercase">Not yet documented</div>
                <div className="flex flex-wrap gap-1.5">{c.coverage.missing.map((a) => <Badge key={a} tone="estimated">{a}</Badge>)}</div>
              </div>
            )}
          </div>
        </div>
      </Block>

      {!!c.timeline?.length && (
        <Block id="timeline" title="Timeline" reveal={reveal}>
          <ol className="grid gap-3">
            {c.timeline.map((t) => (
              <li key={t.month} className="grid grid-cols-[5.5rem_minmax(0,1fr)] items-center gap-4 text-meta">
                <span className="font-semibold text-ink-2">{t.label || t.month}</span>
                <div>
                  <div className="flex items-center gap-3">
                    <span className="h-2 rounded-full bg-accent" style={{ width: `${(t.assetCount / timelineMax) * 70}%`, minWidth: 6 }} aria-hidden />
                    <span className="tabular shrink-0 text-ink-3">{pluralize(t.assetCount, 'asset')}</span>
                  </div>
                  {!!t.activities?.length && <p className="mt-1 truncate text-ink-3">{t.activities.join(' · ')}</p>}
                </div>
              </li>
            ))}
          </ol>
        </Block>
      )}

      {pair?.before && pair.after && (
        <Block id="before-after" eyebrow={<AiLabel />} title="Before and after" reveal={reveal}>
          <BeforeAfterSlider
            beforeSrc={pair.before.previewUrl || pair.before.thumbnailUrl}
            afterSrc={pair.after.previewUrl || pair.after.thumbnailUrl}
            beforeLabel={`Before · ${formatDate(pair.before.captureDate, 'undated')}`}
            afterLabel={`After · ${formatDate(pair.after.captureDate, 'undated')}`}
            className="print:hidden"
          />
          <div className="hidden grid-cols-2 gap-3 print:grid">
            <MediaThumb src={pair.before.thumbnailUrl} alt="Before" className="aspect-[3/2] rounded-md" />
            <MediaThumb src={pair.after.thumbnailUrl} alt="After" className="aspect-[3/2] rounded-md" />
          </div>
          <p className="mt-2 text-meta text-ink-3">{pair.reason} · AI-detected visual difference, not a measured environmental outcome.</p>
        </Block>
      )}

      {!!gallery.length && (
        <Block id="gallery" title={`Evidence gallery · ${pluralize(gallery.length, 'asset')}`} reveal={reveal}>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {shown.map((g, i) => (
              <li key={g.id || g.thumbnailUrl || i} className="overflow-hidden rounded-md border border-line bg-surface">
                <MediaThumb src={g.thumbnailUrl || g.url} alt={g.summary || 'Evidence'} className="aspect-[4/3]" />
                <div className="p-2 text-label text-ink-3">
                  <span className="line-clamp-2 text-ink-2">{g.summary}</span>
                  <span className="mt-1 block">{[g.evidenceType && EVIDENCE_TYPE_LABEL[g.evidenceType], g.location, formatDate(g.captureDate, '')].filter(Boolean).join(' · ')}</span>
                </div>
              </li>
            ))}
          </ul>
          {gallery.length > 12 && (
            <button type="button" onClick={() => setGalleryAll((v) => !v)} className="mt-3 text-meta font-semibold text-accent hover:underline print:hidden">
              {galleryAll ? 'Show fewer' : `Show all ${gallery.length}`}
            </button>
          )}
        </Block>
      )}

      {!!c.locationMap?.length && (
        <Block id="locations" title="Locations" reveal={reveal}>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <BarList items={c.locationMap.map((l) => ({ label: l.name, value: l.count }))} valueLabel={(n) => pluralize(n, 'asset')} />
            <ul className="grid content-start gap-2">
              {c.locationMap.map((l) => (
                <li key={l.name} className="flex items-center justify-between gap-2 text-meta">
                  <span className="inline-flex items-center gap-1.5 font-medium"><MapPin className="size-4 text-ink-3" aria-hidden />{l.name}</span>
                  <LocationSourceBadge source={l.source as LocationSource} />
                </li>
              ))}
            </ul>
          </div>
        </Block>
      )}

      {!!c.aiObservations?.length && (
        <Block id="observations" eyebrow={<AiLabel />} title="AI observations" reveal={reveal}>
          <p className="mb-4 text-meta text-ink-3">Each statement is model output about uploaded media. Confidence is the model’s certainty, not proof.</p>
          <ul className="grid gap-2">
            {c.aiObservations.slice(0, 40).map((o, i) => (
              <li key={i} className="flex flex-wrap items-start gap-2 rounded-md border border-line bg-surface p-3 text-sm">
                <TrustKindBadge kind={o.kind as InsightKind} />
                <span className="min-w-0 flex-1 text-ink-2">{o.statement}</span>
                {o.confidence != null && <span className="tabular text-meta text-ink-3">{Math.round(o.confidence * 100)}%</span>}
              </li>
            ))}
          </ul>
        </Block>
      )}

      {!!c.evidenceGaps?.length && (
        <Block id="gaps" title="Evidence gaps" reveal={reveal}>
          <ul className="grid gap-2">
            {c.evidenceGaps.map((g) => (
              <li key={g.type + g.message} className="flex items-start gap-3 rounded-md bg-warning-soft p-3 text-sm">
                <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
                <span><b className="font-semibold text-warning">{g.message}.</b> <span className="text-ink-2">{g.suggestedAction}.</span></span>
              </li>
            ))}
          </ul>
        </Block>
      )}

      {!!c.traceability?.length && (
        <Block id="traceability" eyebrow="Claim → evidence → asset → model → time" title="Evidence traceability" reveal={reveal}>
          <div className="scrollbar-thin overflow-x-auto rounded-lg border border-line">
            <table className="w-full min-w-[560px] text-left text-meta">
              <caption className="sr-only">Source assets, AI models and analysis times</caption>
              <thead className="bg-surface-alt text-label tracking-[0.06em] text-ink-3 uppercase">
                <tr>
                  <th scope="col" className="px-3 py-2 font-semibold">#</th>
                  <th scope="col" className="px-3 py-2 font-semibold">Cloudinary asset</th>
                  <th scope="col" className="px-3 py-2 font-semibold">AI model</th>
                  <th scope="col" className="px-3 py-2 font-semibold">Analyzed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line bg-surface">
                {c.traceability.slice(0, 200).map((t, i) => (
                  <tr key={t.publicId || i}>
                    <td className="tabular px-3 py-2 text-ink-3">{i + 1}</td>
                    <td className="px-3 py-2 font-mono text-xs text-ink-2">{t.publicId || '—'}</td>
                    <td className="px-3 py-2 font-mono text-xs text-ink-2">{t.model || '—'}</td>
                    <td className="px-3 py-2 text-ink-3">{formatDateTime(t.analyzedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Block>
      )}

      <Block id="methodology" title="Methodology & limitations" reveal={reveal}>
        <div className="flex gap-3 rounded-lg border border-line bg-surface-alt p-4 text-sm text-ink-2">
          <ShieldAlert className="mt-0.5 size-5 shrink-0 text-ink-3" aria-hidden />
          <div className="grid gap-2">
            <p>{c.methodology}</p>
            <p className="text-ink-3">{c.disclaimer}</p>
            <p className="flex flex-wrap gap-x-4 text-meta text-ink-3">
              <span className="inline-flex items-center gap-1"><Camera className="size-3.5" aria-hidden />Source media stored in Cloudinary</span>
              <span className="inline-flex items-center gap-1"><ListChecks className="size-3.5" aria-hidden />Observed and inferred statements kept separate</span>
            </p>
          </div>
        </div>
      </Block>
    </article>
  );
}
