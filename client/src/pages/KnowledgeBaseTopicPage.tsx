import { CircleAlert } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getKnowledgeBaseTopicErrorMessage } from '../api/knowledgeBase';
import { KnowledgeCardList } from '../components/KnowledgeCardList';
import { KnowledgeCardToolbar } from '../components/KnowledgeCardToolbar';
import { SourceDocumentList } from '../components/SourceDocumentList';
import { TopicIdentity } from '../components/TopicIdentity';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { useKnowledgeBaseTopic } from '../hooks/useKnowledgeBaseTopic';
import { filterKnowledgeCards } from '../lib/filterKnowledgeCards';
import { getTopicPracticePath } from '../lib/practicePaths';
import type { KnowledgeBaseCard, KnowledgeBaseDocument } from '../types/knowledgeBase';

function formatTopicCounts(documentCount: number, knowledgeCardCount: number) {
  const documentsLabel = documentCount === 1 ? '1 source document' : `${documentCount} source documents`;
  const cardsLabel = knowledgeCardCount === 1 ? '1 knowledge card' : `${knowledgeCardCount} knowledge cards`;

  return `${documentsLabel} · ${cardsLabel}`;
}

function sourceLabelFor(card: KnowledgeBaseCard, documents: KnowledgeBaseDocument[]) {
  if (documents.length < 2 || !card.documentId) {
    return null;
  }

  return documents.find((document) => document.id === card.documentId)?.filename ?? null;
}

export function KnowledgeBaseTopicPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data, error, isPending, isError } = useKnowledgeBaseTopic(slug);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [hasCode, setHasCode] = useState(false);
  const [query, setQuery] = useState('');
  const topic = data?.topic;
  const knowledgeCards = data?.knowledgeCards ?? [];
  const documents = data?.documents ?? [];
  const filteredCards = useMemo(
    () =>
      filterKnowledgeCards(knowledgeCards, { documentId, hasCode, query }).map((card) => ({
        ...card,
        sourceLabel: sourceLabelFor(card, documents),
      })),
    [documentId, documents, hasCode, knowledgeCards, query],
  );
  const filtersActive = Boolean(documentId) || hasCode || Boolean(query.trim());

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 p-6">
      {isPending ? (
        <div className="grid gap-3">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-80" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : null}

      {isError ? (
        <Alert variant="destructive">
          <CircleAlert />
          <AlertDescription>{getKnowledgeBaseTopicErrorMessage(error)}</AlertDescription>
        </Alert>
      ) : null}

      {topic ? (
        <>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1 space-y-2">
              <TopicIdentity topic={topic} />
              <p className="text-sm text-muted-foreground">
                {formatTopicCounts(documents.length, knowledgeCards.length)}
              </p>
            </div>
            {knowledgeCards.length > 0 ? (
              <Button asChild className="shrink-0">
                <Link to={getTopicPracticePath(topic.slug)}>Start Practice</Link>
              </Button>
            ) : (
              <p className="shrink-0 text-sm text-muted-foreground">Add knowledge cards before starting practice.</p>
            )}
          </div>

          <section className="grid gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-semibold">
                Knowledge Cards · {filtersActive ? `${filteredCards.length} / ${knowledgeCards.length}` : knowledgeCards.length}
              </h2>
              {knowledgeCards.length > 0 ? (
                <KnowledgeCardToolbar
                  documents={documents}
                  documentId={documentId}
                  hasCode={hasCode}
                  query={query}
                  onDocumentIdChange={setDocumentId}
                  onHasCodeChange={setHasCode}
                  onQueryChange={setQuery}
                />
              ) : null}
            </div>
            {knowledgeCards.length === 0 ? (
              <p className="text-sm text-muted-foreground">No knowledge cards are available for this topic.</p>
            ) : filteredCards.length === 0 ? (
              <p className="text-sm text-muted-foreground">No knowledge cards match these filters.</p>
            ) : (
              <KnowledgeCardList
                key={`${topic.slug}-${documentId ?? 'all'}-${hasCode}-${query}`}
                cards={filteredCards}
              />
            )}
          </section>

          <section className="grid gap-4">
            <h2 className="text-lg font-semibold">Source Documents · {documents.length}</h2>
            {documents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No source documents are available for this topic.</p>
            ) : (
              <SourceDocumentList
                key={topic.slug}
                documents={documents}
                selectedDocumentId={documentId}
                onSelectDocument={setDocumentId}
              />
            )}
          </section>
        </>
      ) : null}
    </main>
  );
}
