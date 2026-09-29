import type { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/Misc';

export const testQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } } });

/**
 * Renders a component inside a memory router with a fresh query client.
 * Uses <MemoryRouter> rather than a data router: the data router builds fetch Requests whose
 * AbortSignal jsdom and Node's undici disagree about.
 */
export function renderRoute(
  element: ReactElement,
  { path = '/', initial = '/', extra = [] as Array<{ path: string; element: ReactElement }> } = {},
) {
  const client = testQueryClient();
  const utils = render(
    <QueryClientProvider client={client}>
      <TooltipProvider>
        <MemoryRouter initialEntries={[initial]}>
          <Routes>
            <Route path={path} element={element} />
            {extra.map((r) => (
              <Route key={r.path} path={r.path} element={r.element} />
            ))}
          </Routes>
        </MemoryRouter>
      </TooltipProvider>
    </QueryClientProvider>,
  );
  return { ...utils, client };
}

export function renderUi(element: ReactElement) {
  return render(<TooltipProvider>{element}</TooltipProvider>);
}
