import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { q } from '@/api/queries';
import type { EvidenceType, MediaAsset } from '@/api/types';
import { EVIDENCE_TYPES, EVIDENCE_TYPE_LABEL } from '@/lib/constants';
import { cn, formatDate } from '@/lib/utils';
import { Dialog } from '@/components/ui/Overlay';
import { Input } from '@/components/ui/Form';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback';
import { MediaThumb } from './MediaThumb';
import { EvidenceTypeBadge } from './Badges';

export function MediaPickerDialog({
  open,
  onOpenChange,
  projectId,
  title,
  defaultType,
  onPick,
  excludeId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  projectId: string;
  title: string;
  defaultType?: EvidenceType;
  onPick: (a: MediaAsset) => void;
  excludeId?: string;
}) {
  const [type, setType] = useState<EvidenceType | ''>(defaultType || '');
  const [text, setText] = useState('');
  const query = useQuery({ ...q.media({ projectId, evidenceType: type, q: text || undefined, limit: 60, processingStatus: 'COMPLETED' }), enabled: open });
  const items = (query.data?.items || []).filter((a) => a._id !== excludeId);
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={title} description="Only analyzed media can be compared." className="max-w-3xl">
      <div className="mb-4 grid gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-3" aria-hidden />
          <Input type="search" value={text} onChange={(e) => setText(e.target.value)} placeholder="Filter by keyword, place or activity" className="pl-9" aria-label="Filter media" />
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Evidence type">
          {(['', ...EVIDENCE_TYPES] as const).map((t) => (
            <button
              key={t || 'all'}
              type="button"
              aria-pressed={type === t}
              onClick={() => setType(t)}
              className={cn('touch-target h-8 rounded-full border px-3 text-meta font-medium', type === t ? 'border-accent bg-accent-soft text-accent' : 'border-line text-ink-2 hover:border-line-hover')}
            >
              {t ? EVIDENCE_TYPE_LABEL[t] : 'All'}
            </button>
          ))}
        </div>
      </div>
      {query.isPending ? (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="aspect-square" />)}</div>
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} compact />
      ) : !items.length ? (
        <EmptyState title="No matching media" description="Try another evidence type or keyword." compact />
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {items.map((a) => (
            <li key={a._id}>
              <button
                type="button"
                onClick={() => {
                  onPick(a);
                  onOpenChange(false);
                }}
                className="group w-full overflow-hidden rounded-md border border-line text-left transition-colors hover:border-accent focus-visible:outline-2 focus-visible:outline-focus"
              >
                <MediaThumb src={a.thumbnailUrl} alt="" filename={a.originalFilename} className="aspect-[4/3]" />
                <span className="block p-2">
                  <span className="block truncate text-meta font-semibold">{a.location?.name || a.originalFilename}</span>
                  <span className="mt-1 flex items-center justify-between gap-1">
                    <EvidenceTypeBadge type={a.evidenceType} />
                    <span className="text-label text-ink-3">{formatDate(a.captureDate)}</span>
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Dialog>
  );
}
