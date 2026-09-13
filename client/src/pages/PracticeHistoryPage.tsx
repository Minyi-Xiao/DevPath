import { CircleAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getAttemptHistoryErrorMessage } from '../api/attempts';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Skeleton } from '../components/ui/skeleton';
import { useAttemptHistory } from '../hooks/useAttemptHistory';

function formatAttemptDate(completedAt: string) {
  return new Date(completedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function PracticeHistoryPage() {
  const { data: attempts, error, isPending, isError } = useAttemptHistory();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 p-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">My Practice History</h1>
        <p className="text-muted-foreground">Review your previous practice attempts.</p>
      </div>

      {isPending ? (
        <ul className="grid gap-3">
          {Array.from({ length: 3 }, (_, index) => (
            <li key={index}>
              <Card>
                <CardHeader className="gap-3">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-4 w-32" />
                </CardHeader>
              </Card>
            </li>
          ))}
        </ul>
      ) : null}

      {isError ? (
        <Alert variant="destructive">
          <CircleAlert />
          <AlertDescription>{getAttemptHistoryErrorMessage(error)}</AlertDescription>
        </Alert>
      ) : null}

      {attempts && attempts.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">No practice attempts yet</CardTitle>
            <CardDescription>You have not completed any practice attempts yet.</CardDescription>
          </CardHeader>
          <div className="px-6 pb-6">
            <Button asChild>
              <Link to="/knowledge-base">Start with a topic</Link>
            </Button>
          </div>
        </Card>
      ) : null}

      {attempts && attempts.length > 0 ? (
        <ul className="grid gap-3">
          {attempts.map((attempt) => (
            <li key={attempt.id}>
              <Link to={`/attempts/${attempt.id}`} className="block">
                <Card className="transition-colors hover:bg-accent/40">
                  <CardHeader>
                    <CardTitle className="text-lg">{attempt.topic.name}</CardTitle>
                    <p className="text-2xl font-semibold tracking-tight">{attempt.percentage}%</p>
                    <CardDescription>
                      {attempt.correctCount} / {attempt.totalQuestions} correct · {formatAttemptDate(attempt.completedAt)}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </main>
  );
}
