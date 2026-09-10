import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getSubmitPracticeErrorMessage, getTopicPracticeErrorMessage } from '../api/practice';
import { useSubmitPractice } from '../hooks/useSubmitPractice';
import { useTopicPractice } from '../hooks/useTopicPractice';

const difficultyLabels = {
  BEGINNER: 'Beginner',
  INTERMEDIATE: 'Intermediate',
  ADVANCED: 'Advanced',
} as const;

function createSubmissionId() {
  return crypto.randomUUID();
}

export function PracticePage() {
  const { topicSlug } = useParams<{ topicSlug: string }>();
  const navigate = useNavigate();
  const { data, error, isPending, isError } = useTopicPractice(topicSlug);
  const submitMutation = useSubmitPractice();
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [incompleteError, setIncompleteError] = useState<string | null>(null);
  const submissionIdRef = useRef(createSubmissionId());

  useEffect(() => {
    setQuestionIndex(0);
    setAnswers({});
    setIncompleteError(null);
    submissionIdRef.current = createSubmissionId();
    submitMutation.reset();
  }, [topicSlug]);

  const questions = data?.questions ?? [];
  const currentQuestion = questions[questionIndex];
  const isFirstQuestion = questionIndex <= 0;
  const isLastQuestion = questions.length > 0 && questionIndex >= questions.length - 1;
  const answeredCount = Object.keys(answers).length;
  const allAnswered = questions.length > 0 && answeredCount === questions.length;

  function selectOption(questionId: string, optionId: string) {
    setIncompleteError(null);
    setAnswers((current) => ({ ...current, [questionId]: optionId }));
  }

  function handleSubmit() {
    if (submitMutation.isPending) {
      return;
    }

    if (!topicSlug || !allAnswered) {
      setIncompleteError('Answer every question before submitting.');
      return;
    }

    submitMutation.mutate(
      {
        topicSlug,
        submissionId: submissionIdRef.current,
        answers: questions.map((question) => {
          const optionId = answers[question.id];

          if (!optionId) {
            throw new Error('Missing answer');
          }

          return {
            questionId: question.id,
            optionId,
          };
        }),
      },
      {
        onSuccess: (payload) => {
          setIncompleteError(null);
          navigate(`/attempts/${payload.attemptId}`);
        },
      },
    );
  }

  return (
    <main className="page page-topics">
      <section className="learning">
        <p className="learning-back">
          <Link to={topicSlug ? `/topics/${topicSlug}` : '/topics'}>Back to topic</Link>
        </p>

        {isPending ? <p className="state">Loading practice questions...</p> : null}
        {isError ? <p className="state state-error">{getTopicPracticeErrorMessage(error)}</p> : null}

        {data && questions.length === 0 ? (
          <>
            <h1>{data.topic.name}</h1>
            <p className="state">No practice questions are available for this topic yet.</p>
          </>
        ) : null}

        {data && currentQuestion ? (
          <>
            <h1>{data.topic.name}</h1>
            <p className="learning-counter">
              Question {questionIndex + 1} / {questions.length}
              <span className="practice-answered">
                {answeredCount} answered
              </span>
            </p>

            <article className="learning-card">
              <p className="practice-meta">
                <span>{difficultyLabels[currentQuestion.difficulty]}</span>
                {currentQuestion.tags.length > 0 ? (
                  <span>{currentQuestion.tags.map((tag) => tag.name).join(' · ')}</span>
                ) : null}
              </p>
              <h2>{currentQuestion.prompt}</h2>

              <fieldset className="practice-options">
                <legend className="visually-hidden">Answer choices</legend>
                {currentQuestion.options.map((option) => {
                  const isSelected = answers[currentQuestion.id] === option.id;

                  return (
                    <label
                      key={option.id}
                      className={isSelected ? 'practice-option practice-option-selected' : 'practice-option'}
                    >
                      <input
                        type="radio"
                        name={currentQuestion.id}
                        value={option.id}
                        checked={isSelected}
                        onChange={() => selectOption(currentQuestion.id, option.id)}
                      />
                      <span>{option.text}</span>
                    </label>
                  );
                })}
              </fieldset>
            </article>

            {incompleteError ? <p className="state state-error">{incompleteError}</p> : null}
            {submitMutation.isError ? (
              <p className="state state-error">{getSubmitPracticeErrorMessage(submitMutation.error)}</p>
            ) : null}

            <div className="learning-nav">
              <button
                type="button"
                disabled={isFirstQuestion || submitMutation.isPending}
                onClick={() => setQuestionIndex((index) => index - 1)}
              >
                Previous
              </button>
              {isLastQuestion ? (
                <button
                  type="button"
                  className="practice-submit"
                  disabled={submitMutation.isPending}
                  onClick={handleSubmit}
                >
                  {submitMutation.isPending ? 'Submitting...' : 'Submit'}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={submitMutation.isPending}
                  onClick={() => setQuestionIndex((index) => index + 1)}
                >
                  Next
                </button>
              )}
            </div>
          </>
        ) : null}
      </section>
    </main>
  );
}
