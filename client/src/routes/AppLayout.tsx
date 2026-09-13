import { Outlet } from 'react-router-dom';
import { AppSidebar } from '../components/AppSidebar';
import { PageBackButton, PageBackProvider } from '../components/PageBack';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '../components/ui/sidebar';

export function AppLayout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <PageBackProvider>
          <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger />
            <PageBackButton />
          </header>
          <Outlet />
        </PageBackProvider>
      </SidebarInset>
    </SidebarProvider>
  );
}
