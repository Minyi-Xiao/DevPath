import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getTopicLearningCardsErrorMessage } from '../api/learningCards';
import { useTopicLearningCards } from '../hooks/useTopicLearningCards';

export function TopicLearningPage() {
  const { topicSlug } = useParams<{ topicSlug: string }>();
  const { data, error, isPending, isError } = useTopicLearningCards(topicSlug);
  const [cardIndex, setCardIndex] = useState(0);

  useEffect(() => {
    setCardIndex(0);
  }, [topicSlug]);

  const cards = data?.learningCards ?? [];
  const currentCard = cards[cardIndex];
  const isFirstCard = cardIndex <= 0;
  const isLastCard = cardIndex >= cards.length - 1;

  return (
    <main className="page page-topics">
      <section className="learning">
        <p className="learning-back">
          <Link to="/topics">Back to topics</Link>
        </p>

        {isPending ? <p className="state">Loading learning cards...</p> : null}
        {isError ? <p className="state state-error">{getTopicLearningCardsErrorMessage(error)}</p> : null}

        {data ? (
          <div className="learning-header">
            <h1>{data.topic.name}</h1>
            <Link to={`/topics/${data.topic.slug}/practice`} className="practice-start">
              Start Practice
            </Link>
          </div>
        ) : null}

        {data && cards.length === 0 ? (
          <p className="state">No learning cards are available for this topic yet.</p>
        ) : null}

        {data && currentCard ? (
          <>
            <p className="learning-counter">
              {cardIndex + 1} / {cards.length}
            </p>

            <article className="learning-card">
              <h2>{currentCard.title}</h2>
              <p className="learning-content">{currentCard.content}</p>

              {currentCard.codeExample ? (
                <pre className="learning-code">
                  <code>{currentCard.codeExample}</code>
                </pre>
              ) : null}

              {currentCard.developerNote ? (
                <p className="learning-note">
                  <strong>Developer note: </strong>
                  {currentCard.developerNote}
                </p>
              ) : null}
            </article>

            <div className="learning-nav">
              <button type="button" disabled={isFirstCard} onClick={() => setCardIndex((index) => index - 1)}>
                Previous
              </button>
              <button type="button" disabled={isLastCard} onClick={() => setCardIndex((index) => index + 1)}>
                Next
              </button>
            </div>
          </>
        ) : null}
      </section>
    </main>
  );
}
