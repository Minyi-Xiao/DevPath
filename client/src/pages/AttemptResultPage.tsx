import { CircleAlert } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { getAttemptErrorMessage } from '../api/attempts';
import { usePageBackTo } from '../components/PageBack';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Skeleton } from '../components/ui/skeleton';
import { useAttempt } from '../hooks/useAttempt';
import { cn } from '../lib/utils';

export function AttemptResultPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const { data, error, isPending, isError } = useAttempt(attemptId);
  usePageBackTo(data ? `/knowledge-base/topics/${data.topic.slug}` : null);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-6">
      {isPending ? (
        <div className="grid gap-3">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-12 w-32" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : null}

      {isError ? (
        <Alert variant="destructive">
          <CircleAlert />
          <AlertDescription>{getAttemptErrorMessage(error)}</AlertDescription>
        </Alert>
      ) : null}

      {data ? (
        <>
          <div className="space-y-3">
            <h1 className="text-2xl font-semibold tracking-tight">{data.topic.name}</h1>
            <div className="flex flex-wrap items-baseline gap-3">
              <p className="text-3xl font-semibold tracking-tight">
                {data.score.correct} / {data.score.total}
              </p>
              <p className="text-lg font-medium text-muted-foreground">{data.score.percentage}%</p>
            </div>
          </div>

          <ul className="grid gap-3">
            {data.answers.map((item, index) => (
              <li key={item.questionId}>
                <Card
                  className={cn(
                    item.correct ? 'border-emerald-600/40' : 'border-destructive/50',
                  )}
                >
                  <CardHeader>
                    <p
                      className={cn(
                        'text-sm font-semibold',
                        item.correct ? 'text-emerald-700' : 'text-destructive',
                      )}
                    >
                      {item.correct ? 'Correct' : 'Incorrect'}
                    </p>
                    <CardTitle className="text-lg">
                      {index + 1}. {item.prompt}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-2 text-sm">
                    <p>
                      <span className="font-medium">Your answer: </span>
                      {item.selectedOption.text}
                    </p>
                    <p>
                      <span className="font-medium">Correct answer: </span>
                      {item.correctOption.text}
                    </p>
                    <p className="text-muted-foreground">{item.explanation}</p>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap gap-3">
            <Button variant="outline" asChild>
              <Link to={`/knowledge-base/topics/${data.topic.slug}`}>Back to topic</Link>
            </Button>
            <Button asChild>
              <Link to={`/knowledge-base/topics/${data.topic.slug}/practice`}>Practice again</Link>
            </Button>
          </div>
        </>
      ) : null}
    </main>
  );
}
