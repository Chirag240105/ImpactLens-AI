import { Logo } from '@/components/Logo';
import { Skeleton } from '@/components/ui/Feedback';

export function FullPageLoader() {
  return (
    <div className="grid min-h-dvh place-items-center bg-bg" role="status" aria-label="Loading ImpactLens">
      <div className="flex flex-col items-center gap-4">
        <Logo />
        <div className="h-1 w-32 overflow-hidden rounded-full bg-sunken">
          <div className="skeleton h-full w-full" />
        </div>
      </div>
    </div>
  );
}

export function RouteFallback() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading page">
      <div className="space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-7 w-72" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-28 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-72 rounded-lg" />
    </div>
  );
}
