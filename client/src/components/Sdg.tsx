import type { SdgAlignment } from '@/api/types';
import { Tooltip } from '@/components/ui/Misc';

/** SDG number chip: official goal colour as a marker, ink text for contrast. */
export function SdgChip({ goal, name, detail }: { goal: number; name: string; detail?: string }) {
  return (
    <Tooltip content={detail ? `${name} — ${detail}` : name}>
      <span tabIndex={0} className="inline-flex h-[1.375rem] items-center gap-1.5 rounded-full border border-line bg-surface pr-2 pl-1 text-label font-semibold text-ink">
        <span aria-hidden className="size-3.5 rounded-full" style={{ background: `var(--sdg-${goal})` }} />
        SDG {goal}
        <span className="sr-only">: {name}</span>
      </span>
    </Tooltip>
  );
}

/** Bars of evidence per goal ("aligned with", never "contributes to"). */
export function SdgList({ items, emptyLabel = 'No SDG-aligned evidence yet.' }: { items?: SdgAlignment[]; emptyLabel?: string }) {
  if (!items?.length) return <p className="text-meta text-ink-3">{emptyLabel}</p>;
  const max = Math.max(1, ...items.map((i) => i.assets));
  return (
    <ul className="grid gap-3">
      {items.map((g) => (
        <li key={g.goal}>
          <div className="mb-1 flex items-baseline justify-between gap-2 text-meta">
            <span className="flex min-w-0 items-center gap-2">
              <span aria-hidden className="size-3 shrink-0 rounded-sm" style={{ background: `var(--sdg-${g.goal})` }} />
              <span className="truncate font-medium text-ink-2">
                <b className="font-semibold text-ink">SDG {g.goal}</b> · {g.name}
              </span>
            </span>
            <span className="tabular shrink-0 text-ink-3">
              {g.assets} assets · {g.share}%
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-sunken">
            <div className="h-full rounded-full" style={{ width: `${(g.assets / max) * 100}%`, background: `var(--sdg-${g.goal})` }} />
          </div>
          {!!g.topTerms.length && <p className="mt-1 truncate text-label text-ink-3">matched: {g.topTerms.join(', ')}</p>}
        </li>
      ))}
    </ul>
  );
}
