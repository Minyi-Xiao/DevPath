import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { setUnauthorizedListener } from './api/http';
import { resetUserScopedQueries } from './lib/queryCache';
import { AppRoutes } from './routes/AppRoutes';

const queryClient = new QueryClient();

setUnauthorizedListener(() => {
  resetUserScopedQueries(queryClient, null);
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
