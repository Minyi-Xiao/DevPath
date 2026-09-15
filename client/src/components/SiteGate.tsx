import axios from 'axios';
import { CircleAlert } from 'lucide-react';
import { useState, type FormEvent, type ReactNode } from 'react';
import { useSiteGateStatus, useUnlockSiteGate } from '../hooks/useSiteGate';
import { Alert, AlertDescription } from './ui/alert';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';

function getUnlockErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 429) {
      return 'Too many attempts. Please wait and try again.';
    }

    if (error.response?.status === 403) {
      return 'Incorrect site password.';
    }
  }

  return 'Could not unlock the site. Please try again.';
}

export function SiteGate({ children }: { children: ReactNode }) {
  const { data, isPending, isError } = useSiteGateStatus();
  const unlockMutation = useUnlockSiteGate();
  const [password, setPassword] = useState('');

  if (isPending) {
    return (
      <main className="flex min-h-svh items-center justify-center p-6">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </main>
    );
  }

  if (isError && import.meta.env.DEV) {
    return children;
  }

  if (!isError && data && (!data.required || data.unlocked)) {
    return children;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (unlockMutation.isPending) {
      return;
    }

    unlockMutation.mutate(password);
  }

  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">DevPath is locked</CardTitle>
          <CardDescription>Enter the site password to continue. This keeps the AI features off the public internet.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={handleSubmit}>
            <div className="grid gap-2">
              <Label htmlFor="site-gate-password">Site password</Label>
              <Input
                id="site-gate-password"
                type="password"
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
            {isError ? (
              <Alert variant="destructive">
                <CircleAlert />
                <AlertDescription>Could not reach the server. Check that the API is running.</AlertDescription>
              </Alert>
            ) : null}
            {unlockMutation.isError ? (
              <Alert variant="destructive">
                <CircleAlert />
                <AlertDescription>{getUnlockErrorMessage(unlockMutation.error)}</AlertDescription>
              </Alert>
            ) : null}
            <Button type="submit" disabled={unlockMutation.isPending}>
              {unlockMutation.isPending ? 'Unlocking...' : 'Unlock'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
