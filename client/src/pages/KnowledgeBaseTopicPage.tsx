import { Link, useParams } from 'react-router-dom';
import { KnowledgeCardList } from '../components/KnowledgeCardList';
import { SourceDocumentList } from '../components/SourceDocumentList';
import { getKnowledgeBaseTopicErrorMessage } from '../api/knowledgeBase';
import { useKnowledgeBaseTopic } from '../hooks/useKnowledgeBaseTopic';

function formatTopicCounts(documentCount: number, knowledgeCardCount: number) {
  const documentsLabel = documentCount === 1 ? '1 source document' : `${documentCount} source documents`;
  const cardsLabel = knowledgeCardCount === 1 ? '1 knowledge card' : `${knowledgeCardCount} knowledge cards`;

  return `${documentsLabel} · ${cardsLabel}`;
}

export function KnowledgeBaseTopicPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data, error, isPending, isError } = useKnowledgeBaseTopic(slug);
  const topic = data?.topic;
  const knowledgeCards = data?.knowledgeCards ?? [];
  const documents = data?.documents ?? [];

  return (
    <main className="page page-topics">
      <section className="topics">
        <p className="learning-back">
          <Link to="/knowledge-base">← Knowledge Base</Link>
        </p>

        {isPending ? <p className="state">Loading topic...</p> : null}

        {isError ? (
          <>
            <p className="state state-error">{getKnowledgeBaseTopicErrorMessage(error)}</p>
            <Link to="/knowledge-base" className="practice-start">
              Back to Knowledge Base
            </Link>
          </>
        ) : null}

        {topic ? (
          <>
            <div className="learning-header">
              <h1>{topic.name}</h1>
              {knowledgeCards.length > 0 ? (
                <Link to={`/knowledge-base/topics/${topic.slug}/practice`} className="practice-start">
                  Start Practice
                </Link>
              ) : (
                <p className="state">Add knowledge cards before starting practice.</p>
              )}
            </div>
            {topic.description.trim() ? <p className="tagline">{topic.description}</p> : null}
            <p className="review-filename">{formatTopicCounts(documents.length, knowledgeCards.length)}</p>

            <section className="review-section">
              <h2>Knowledge Cards · {knowledgeCards.length}</h2>
              {knowledgeCards.length === 0 ? (
                <p className="state">No knowledge cards are available for this topic.</p>
              ) : (
                <KnowledgeCardList key={topic.slug} cards={knowledgeCards} />
              )}
            </section>

            <section className="review-section">
              <h2>Source Documents · {documents.length}</h2>
              {documents.length === 0 ? (
                <p className="state">No source documents are available for this topic.</p>
              ) : (
                <SourceDocumentList key={topic.slug} documents={documents} />
              )}
            </section>
          </>
        ) : null}
      </section>
    </main>
  );
}