import { Link, useNavigate } from 'react-router-dom';
import { useCurrentUser, useLogout } from '../hooks/useAuth';

export function AppNav() {
  const navigate = useNavigate();
  const { data: user, isPending } = useCurrentUser();
  const logoutMutation = useLogout();

  function handleLogout() {
    if (logoutMutation.isPending) {
      return;
    }

    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        navigate('/');
      },
    });
  }

  return (
    <header className="app-nav">
      <Link to="/" className="app-nav-brand">
        DevPath
      </Link>
      <nav className="app-nav-links">
        <Link to="/topics">Topics</Link>
        {isPending ? null : user ? (
          <>
            <Link to="/history">History</Link>
            <span className="app-nav-email">{user.email}</span>
            <button type="button" onClick={handleLogout} disabled={logoutMutation.isPending}>
              {logoutMutation.isPending ? 'Logging out...' : 'Logout'}
            </button>
          </>
        ) : (
          <>
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
          </>
        )}
      </nav>
    </header>
  );
}
