import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { setSiteGateRequiredListener, setUnauthorizedListener } from './api/http';
import { SiteGate } from './components/SiteGate';
import { siteGateQueryKey } from './hooks/useSiteGate';
import { resetUserScopedQueries } from './lib/queryCache';
import { AppRoutes } from './routes/AppRoutes';

const queryClient = new QueryClient();

setUnauthorizedListener(() => {
  resetUserScopedQueries(queryClient, null);
});

setSiteGateRequiredListener(() => {
  queryClient.setQueryData(siteGateQueryKey, { required: true, unlocked: false });
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <SiteGate>
          <AppRoutes />
        </SiteGate>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
