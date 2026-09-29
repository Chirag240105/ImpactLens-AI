import { StrictMode, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { ApiError } from '@/api/client';
import { TooltipProvider } from '@/components/ui/Misc';
import { router } from './router';
import './styles/index.css';

const Devtools = import.meta.env.DEV && import.meta.env.VITE_QUERY_DEVTOOLS === 'true'
  ? lazy(() => import('@tanstack/react-query-devtools').then((m) => ({ default: m.ReactQueryDevtools })))
  : () => null;

// One client for the app lifetime (TanStack Query skill: never instantiate inside a component).
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 10 * 60_000,
      refetchOnWindowFocus: true,
      // 4xx responses won't succeed on retry; only retry network and server errors.
      retry: (count, error) =>
        !(error instanceof ApiError && error.status >= 400 && error.status < 500) && count < 2,
    },
    mutations: { retry: 0 },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <RouterProvider router={router} />
      </TooltipProvider>
      <Toaster
        position="bottom-right"
        closeButton
        toastOptions={{
          classNames: {
            toast: '!bg-surface !text-ink !border-line !shadow-md !font-sans !rounded-lg',
            description: '!text-ink-3',
          },
        }}
      />
      <Suspense fallback={null}>
        <Devtools buttonPosition="top-right" />
      </Suspense>
    </QueryClientProvider>
  </StrictMode>,
);
