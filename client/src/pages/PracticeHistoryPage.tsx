import { Link } from 'react-router-dom';
import { getAttemptHistoryErrorMessage } from '../api/attempts';
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
    <main className="page page-topics">
      <section className="topics">
        <h1>My Practice History</h1>
        <p className="tagline">Review your previous practice attempts.</p>

        {isPending ? <p className="state">Loading practice history...</p> : null}
        {isError ? <p className="state state-error">{getAttemptHistoryErrorMessage(error)}</p> : null}

        {attempts && attempts.length === 0 ? (
          <p className="state">
            You have not completed any practice attempts yet.{' '}
            <Link to="/topics">Start with a topic</Link>.
          </p>
        ) : null}

        {attempts && attempts.length > 0 ? (
          <ul className="history-list">
            {attempts.map((attempt) => (
              <li key={attempt.id}>
                <Link to={`/attempts/${attempt.id}`} className="history-card">
                  <h2>{attempt.topic.name}</h2>
                  <p className="history-score">{attempt.percentage}%</p>
                  <p className="history-meta">
                    {attempt.correctCount} / {attempt.totalQuestions} correct
                  </p>
                  <p className="history-meta">{formatAttemptDate(attempt.completedAt)}</p>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </main>
  );
}
