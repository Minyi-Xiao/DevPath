import { Outlet } from 'react-router-dom';
import { AppNav } from '../components/AppNav';

export function AppLayout() {
  return (
    <div className="app-shell">
      <AppNav />
      <Outlet />
    </div>
  );
}
