import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { getAuthErrorMessage } from '../api/auth';
import { useCurrentUser, useLogin } from '../hooks/useAuth';
import { getPostAuthRedirect } from '../routes/getPostAuthRedirect';

export function LoginPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { data: user, isPending } = useCurrentUser();
  const loginMutation = useLogin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  if (!isPending && user) {
    return <Navigate to={getPostAuthRedirect(location)} replace />;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loginMutation.isPending) {
      return;
    }

    loginMutation.mutate(
      { email, password },
      {
        onSuccess: () => {
          navigate(getPostAuthRedirect(location), { replace: true });
        },
      },
    );
  }

  return (
    <main className="page">
      <section className="hero">
        <h1>Log in</h1>
        <p className="tagline">Sign in so your practice attempts belong to you.</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            Email
            <input
              type="email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          {loginMutation.isError ? <p className="state state-error">{getAuthErrorMessage(loginMutation.error)}</p> : null}
          <button type="submit" disabled={loginMutation.isPending}>
            {loginMutation.isPending ? 'Signing in...' : 'Log in'}
          </button>
        </form>

        <p className="hero-link">
          Need an account? <Link to="/register" state={location.state}>Register</Link>
        </p>
      </section>
    </main>
  );
}
