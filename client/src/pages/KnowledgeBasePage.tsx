import { CircleAlert, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getKnowledgeBaseErrorMessage } from '../api/knowledgeBase';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Skeleton } from '../components/ui/skeleton';
import { useKnowledgeBaseTopics } from '../hooks/useKnowledgeBaseTopics';

function formatTopicCounts(documentCount: number, knowledgeCardCount: number) {
  const documentsLabel = documentCount === 1 ? '1 document' : `${documentCount} documents`;
  const cardsLabel = knowledgeCardCount === 1 ? '1 knowledge card' : `${knowledgeCardCount} knowledge cards`;

  return `${documentsLabel} · ${cardsLabel}`;
}

export function KnowledgeBasePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [successMessage] = useState(
    () => (location.state as { message?: string } | null)?.message ?? null,
  );
  const { data: topics, error, isPending, isError, refetch, isFetching } = useKnowledgeBaseTopics();

  useEffect(() => {
    if ((location.state as { message?: string } | null)?.message) {
      navigate(location.pathname, { replace: true });
    }
  }, [location.pathname, location.state, navigate]);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 p-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Knowledge Base</h1>
        <p className="text-muted-foreground">Browse your saved topics, knowledge cards, and source documents.</p>
      </div>

      {successMessage ? (
        <Alert>
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      ) : null}

      {isPending ? (
        <ul className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }, (_, index) => (
            <li key={index}>
              <Card>
                <CardHeader className="gap-3">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
              </Card>
            </li>
          ))}
        </ul>
      ) : null}

      {isError ? (
        <div className="grid gap-4">
          <Alert variant="destructive">
            <CircleAlert />
            <AlertDescription>{getKnowledgeBaseErrorMessage(error)}</AlertDescription>
          </Alert>
          <Button type="button" className="w-fit" disabled={isFetching} onClick={() => refetch()}>
            Try Again
          </Button>
        </div>
      ) : null}

      {topics && topics.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Your Knowledge Base is empty</CardTitle>
            <CardDescription>
              Upload your first learning document to start building your knowledge base.
            </CardDescription>
          </CardHeader>
          <div className="px-6 pb-6">
            <Button asChild>
              <Link to="/new-knowledge">
                <Plus />
                New Knowledge
              </Link>
            </Button>
          </div>
        </Card>
      ) : null}

      {topics && topics.length > 0 ? (
        <ul className="grid gap-4 sm:grid-cols-2">
          {topics.map((topic) => (
            <li key={topic.id}>
              <Link to={`/knowledge-base/topics/${topic.slug}`} className="block h-full">
                <Card className="h-full transition-colors hover:bg-accent/40">
                  <CardHeader>
                    <CardTitle className="text-lg">{topic.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {formatTopicCounts(topic.documentCount, topic.knowledgeCardCount)}
                    </p>
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
