import { CircleAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getAttemptHistoryErrorMessage } from '../api/attempts';
import { getKnowledgeBaseErrorMessage } from '../api/knowledgeBase';
import { PracticeAgainDialog } from '../components/PracticeAgainDialog';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Skeleton } from '../components/ui/skeleton';
import { useAttemptHistory } from '../hooks/useAttemptHistory';
import { useCurrentUser } from '../hooks/useAuth';
import { useKnowledgeBaseTopics } from '../hooks/useKnowledgeBaseTopics';
import { buildHomeWorkspace, type HomeWorkspaceStats } from '../lib/homeWorkspace';
import type { AttemptHistoryItem } from '../types/attempt';
import type { KnowledgeBaseTopic } from '../types/knowledgeBase';

const productSteps = [
  'Upload a document',
  'Review AI knowledge cards',
  'Practice the topic',
] as const;

function formatAttemptDate(completedAt: string) {
  return new Date(completedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatKnowledgeCardCount(count: number) {
  return count === 1 ? '1 knowledge card' : `${count} knowledge cards`;
}

function ProductSteps() {
  return (
    <ol className="grid gap-3 sm:grid-cols-3">
      {productSteps.map((step, index) => (
        <li key={step} className="rounded-xl border bg-card p-4 text-sm">
          <p className="text-muted-foreground">Step {index + 1}</p>
          <p className="mt-1 font-medium">{step}</p>
        </li>
      ))}
    </ol>
  );
}

function WorkspaceStats({ stats }: { stats: HomeWorkspaceStats }) {
  const items = [
    { label: 'Topics', value: String(stats.topicCount) },
    { label: 'Knowledge cards', value: String(stats.cardCount) },
    { label: 'Practice attempts', value: String(stats.attemptCount) },
    { label: 'Latest score', value: stats.latestScore },
  ];

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Snapshot</h2>
      <ul className="grid auto-rows-fr grid-cols-2 gap-3 sm:grid-cols-4">
        {items.map((item) => (
          <li key={item.label} className="h-full">
            <Card className="h-full">
              <CardHeader className="h-full gap-2 p-4">
                <CardDescription className="min-h-10">{item.label}</CardDescription>
                <p className="text-2xl font-semibold tracking-tight">{item.value}</p>
              </CardHeader>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ContinueLearning({
  latestAttempt,
  recentTopics,
}: {
  latestAttempt: AttemptHistoryItem | null;
  recentTopics: KnowledgeBaseTopic[];
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Continue learning</h2>
      <ul className="grid auto-rows-fr gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {latestAttempt ? (
          <li className="h-full">
            <Card className="h-full">
              <CardHeader className="flex h-full flex-col items-start gap-2 p-4">
                <CardDescription>Last practice</CardDescription>
                <CardTitle className="text-base">{latestAttempt.topic.name}</CardTitle>
                <p className="text-2xl font-semibold tracking-tight">{latestAttempt.percentage}%</p>
                <CardDescription>
                  {latestAttempt.correctCount} / {latestAttempt.totalQuestions} correct ·{' '}
                  {formatAttemptDate(latestAttempt.completedAt)}
                </CardDescription>
                <PracticeAgainDialog topicSlug={latestAttempt.topic.slug} attemptId={latestAttempt.id}>
                  <Button type="button" className="mt-auto w-fit">
                    Practice again
                  </Button>
                </PracticeAgainDialog>
              </CardHeader>
            </Card>
          </li>
        ) : null}

        {recentTopics.map((topic) => (
          <li key={topic.id} className="h-full">
            <Link to={`/knowledge-base/topics/${topic.slug}`} className="block h-full">
              <Card className="h-full transition-colors hover:bg-accent/40">
                <CardHeader className="flex h-full flex-col gap-2 p-4">
                  <CardDescription>Topic</CardDescription>
                  <CardTitle className="text-base">{topic.name}</CardTitle>
                  <CardDescription className="mt-auto">
                    {formatKnowledgeCardCount(topic.knowledgeCardCount)}
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function HomePageSkeleton({ greeting }: { greeting?: string }) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 p-6">
      <div className="space-y-4">
        {greeting ? (
          <h1 className="text-2xl font-semibold tracking-tight">{greeting}</h1>
        ) : (
          <Skeleton className="h-8 w-64" />
        )}
        <Skeleton className="h-4 w-80 max-w-full" />
        <Skeleton className="h-9 w-36" />
      </div>
      <ul className="grid auto-rows-fr grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <li key={index} className="h-full">
            <Card className="h-full">
              <CardHeader className="h-full gap-2 p-4">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-12" />
              </CardHeader>
            </Card>
          </li>
        ))}
      </ul>
    </main>
  );
}

export function HomePage() {
  const userQuery = useCurrentUser();
  const user = userQuery.data ?? null;
  const isLoggedIn = Boolean(user);
  const topicsQuery = useKnowledgeBaseTopics(isLoggedIn);
  const attemptsQuery = useAttemptHistory(isLoggedIn);

  if (userQuery.isError) {
    return (
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 p-6">
        <Alert variant="destructive">
          <CircleAlert />
          <AlertDescription>Could not load your account. Please try again.</AlertDescription>
        </Alert>
        <Button type="button" className="w-fit" onClick={() => void userQuery.refetch()}>
          Try Again
        </Button>
      </main>
    );
  }

  if (userQuery.isPending) {
    return <HomePageSkeleton />;
  }

  if (!user) {
    return (
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 p-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Build your developer knowledge</h1>
          <p className="text-muted-foreground">
            Turn learning materials into structured knowledge with AI.
          </p>
        </div>

        <ProductSteps />

        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link to="/login">Log in</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/register">Create an account</Link>
          </Button>
        </div>
      </main>
    );
  }

  if (topicsQuery.isPending || attemptsQuery.isPending) {
    return <HomePageSkeleton greeting="Welcome back" />;
  }

  if (topicsQuery.isError || attemptsQuery.isError) {
    const message = topicsQuery.isError
      ? getKnowledgeBaseErrorMessage(topicsQuery.error)
      : getAttemptHistoryErrorMessage(attemptsQuery.error);

    return (
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 p-6">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <Alert variant="destructive">
          <CircleAlert />
          <AlertDescription>{message}</AlertDescription>
        </Alert>
        <Button
          type="button"
          className="w-fit"
          disabled={topicsQuery.isFetching || attemptsQuery.isFetching}
          onClick={() => {
            void topicsQuery.refetch();
            void attemptsQuery.refetch();
          }}
        >
          Try Again
        </Button>
      </main>
    );
  }

  const workspace = buildHomeWorkspace(topicsQuery.data ?? [], attemptsQuery.data ?? []);
  const showContinueLearning = Boolean(workspace.latestAttempt || workspace.recentTopics.length > 0);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 p-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">{workspace.title}</h1>
          <p className="text-muted-foreground">{workspace.nextStep}</p>
        </div>
        {workspace.primaryCta.label === 'Practice again' && workspace.latestAttempt ? (
          <PracticeAgainDialog
            topicSlug={workspace.latestAttempt.topic.slug}
            attemptId={workspace.latestAttempt.id}
          >
            <Button type="button">{workspace.primaryCta.label}</Button>
          </PracticeAgainDialog>
        ) : (
          <Button asChild>
            <Link to={workspace.primaryCta.to}>{workspace.primaryCta.label}</Link>
          </Button>
        )}
      </div>

      <WorkspaceStats stats={workspace.stats} />

      {showContinueLearning ? (
        <ContinueLearning latestAttempt={workspace.latestAttempt} recentTopics={workspace.recentTopics} />
      ) : null}

      {workspace.showSteps ? <ProductSteps /> : null}
    </main>
  );
}
