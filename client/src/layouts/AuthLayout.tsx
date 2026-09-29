import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '@/components/Logo';
import { LiveCaptureCard } from '@/components/auth/LiveCaptureCard';

// Field photo (Unsplash, same source as the demo seed) — real imagery, never a flat colour block.
const HERO_IMG =
  'https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=1400&q=80';

/**
 * Split auth screen sized to exactly one viewport: the page never scrolls. On very short screens
 * only the form column scrolls internally, so the layout never breaks.
 */
export function AuthLayout({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="grid h-dvh grid-cols-1 overflow-hidden bg-bg lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <div className="scrollbar-thin flex min-h-0 flex-col overflow-y-auto px-6 py-5 sm:px-12">
        <Link to="/login" aria-label="ImpactLens" className="shrink-0 self-start">
          <Logo />
        </Link>
        {/* Bottom padding biases the centred form slightly above the optical middle. */}
        <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center pt-4 pb-[6vh] enter-stagger">
          <h1 className="text-[1.75rem] leading-tight font-extrabold tracking-[-0.03em]">{title}</h1>
          <p className="mt-1.5 text-sm text-ink-2">{subtitle}</p>
          <div className="mt-6">{children}</div>
          {footer && <div className="mt-5 text-meta text-ink-3">{footer}</div>}
        </main>
        <p className="shrink-0 text-label text-ink-3">
          AI observations are model output, not verified outcomes. Every insight links back to its source media.
        </p>
      </div>
      <aside className="relative hidden overflow-hidden lg:block" aria-label="Capture context">
        <img src={HERO_IMG} alt="" aria-hidden className="absolute inset-0 size-full object-cover" />
        <div aria-hidden className="absolute inset-0 bg-[linear-gradient(180deg,transparent_35%,var(--media-shade)_100%)]" />
        <div className="absolute right-10 bottom-10 left-10 animate-fade-up">
          <LiveCaptureCard />
          <p className="mt-4 max-w-md text-sm text-on-media/85">
            Raw field media → AI understanding → evidence search → before/after comparison → traceable impact reports.
          </p>
        </div>
      </aside>
    </div>
  );
}
