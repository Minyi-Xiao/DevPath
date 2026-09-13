import { CircleAlert } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { getAuthErrorMessage } from '../api/auth';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
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
    <main className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Create an account</CardTitle>
          <CardDescription>Register with email and password to start practising.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={handleSubmit}>
            <div className="grid gap-2">
              <Label htmlFor="register-email">Email</Label>
              <Input
                id="register-email"
                type="email"
                name="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="register-password">Password</Label>
              <Input
                id="register-password"
                type="password"
                name="password"
                autoComplete="new-password"
                minLength={8}
                maxLength={72}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              <p className="text-sm text-muted-foreground">Use at least 8 characters.</p>
            </div>
            {registerMutation.isError ? (
              <Alert variant="destructive">
                <CircleAlert />
                <AlertDescription>{getAuthErrorMessage(registerMutation.error)}</AlertDescription>
              </Alert>
            ) : null}
            <Button type="submit" disabled={registerMutation.isPending}>
              {registerMutation.isPending ? 'Creating account...' : 'Register'}
            </Button>
          </form>
          <p className="mt-4 text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link to="/login" state={location.state} className="font-medium text-foreground underline-offset-4 hover:underline">
              Log in
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
