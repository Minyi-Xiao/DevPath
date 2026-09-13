import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getKnowledgeBaseErrorMessage } from '../api/knowledgeBase';
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
    <main className="page page-topics">
      <section className="topics">
        <h1>Knowledge Base</h1>
        <p className="tagline">Browse your saved topics, knowledge cards, and source documents.</p>

        {successMessage ? <p className="state">{successMessage}</p> : null}

        {isPending ? <p className="state">Loading your knowledge base...</p> : null}

        {isError ? (
          <>
            <p className="state state-error">{getKnowledgeBaseErrorMessage(error)}</p>
            <button type="button" className="practice-start" disabled={isFetching} onClick={() => refetch()}>
              Try Again
            </button>
          </>
        ) : null}

        {topics && topics.length === 0 ? (
          <article className="upload-card">
            <h2>Your Knowledge Base is empty</h2>
            <p className="upload-meta">
              Upload your first learning document to start building your knowledge base.
            </p>
            <Link to="/new-knowledge" className="practice-start">
              + New Knowledge
            </Link>
          </article>
        ) : null}

        {topics && topics.length > 0 ? (
          <ul className="topic-grid">
            {topics.map((topic) => (
              <li key={topic.id}>
                <Link to={`/knowledge-base/topics/${topic.slug}`} className="topic-card">
                  <h2>{topic.name}</h2>
                  {topic.description.trim() ? <p>{topic.description}</p> : null}
                  <p className="topic-card-meta">
                    {formatTopicCounts(topic.documentCount, topic.knowledgeCardCount)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </main>
  );
}