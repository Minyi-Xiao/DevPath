import { Link, useParams } from 'react-router-dom';
import { getAttemptErrorMessage } from '../api/attempts';
import { useAttempt } from '../hooks/useAttempt';

export function AttemptResultPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const { data, error, isPending, isError } = useAttempt(attemptId);

  return (
    <main className="page page-topics">
      <section className="learning">
        <p className="learning-back">
          <Link to={data ? `/topics/${data.topic.slug}` : '/topics'}>Back to topic</Link>
        </p>

        {isPending ? <p className="state">Loading practice result...</p> : null}
        {isError ? <p className="state state-error">{getAttemptErrorMessage(error)}</p> : null}

        {data ? (
          <>
            <h1>{data.topic.name}</h1>
            <section className="practice-score">
              <p className="practice-score-value">
                {data.score.correct} / {data.score.total}
              </p>
              <p className="practice-score-percentage">{data.score.percentage}%</p>
            </section>

            <ul className="practice-results">
              {data.answers.map((item, index) => (
                <li
                  key={item.questionId}
                  className={
                    item.correct ? 'practice-result practice-result-correct' : 'practice-result practice-result-incorrect'
                  }
                >
                  <p className="practice-result-status">{item.correct ? 'Correct' : 'Incorrect'}</p>
                  <h2>
                    {index + 1}. {item.prompt}
                  </h2>
                  <p>
                    <strong>Your answer: </strong>
                    {item.selectedOption.text}
                  </p>
                  <p>
                    <strong>Correct answer: </strong>
                    {item.correctOption.text}
                  </p>
                  <p className="practice-explanation">{item.explanation}</p>
                </li>
              ))}
            </ul>

            <div className="learning-nav">
              <Link to={`/topics/${data.topic.slug}`}>Back to topic</Link>
              <Link to={`/topics/${data.topic.slug}/practice`} className="practice-submit">
                Practice again
              </Link>
            </div>
          </>
        ) : null}
      </section>
    </main>
  );
}
