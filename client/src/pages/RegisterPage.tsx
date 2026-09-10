import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { getAuthErrorMessage } from '../api/auth';
import { useCurrentUser, useRegister } from '../hooks/useAuth';
import { getPostAuthRedirect } from '../routes/getPostAuthRedirect';

export function RegisterPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { data: user, isPending } = useCurrentUser();
  const registerMutation = useRegister();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  if (!isPending && user) {
    return <Navigate to={getPostAuthRedirect(location)} replace />;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (registerMutation.isPending) {
      return;
    }

    registerMutation.mutate(
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
        <h1>Create an account</h1>
        <p className="tagline">Register with email and password to start practising.</p>

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
              autoComplete="new-password"
              minLength={8}
              maxLength={72}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          <p className="auth-hint">Use at least 8 characters.</p>
          {registerMutation.isError ? (
            <p className="state state-error">{getAuthErrorMessage(registerMutation.error)}</p>
          ) : null}
          <button type="submit" disabled={registerMutation.isPending}>
            {registerMutation.isPending ? 'Creating account...' : 'Register'}
          </button>
        </form>

        <p className="hero-link">
          Already have an account? <Link to="/login" state={location.state}>Log in</Link>
        </p>
      </section>
    </main>
  );
}
