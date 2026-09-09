import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getSubmitPracticeErrorMessage, getTopicPracticeErrorMessage } from '../api/practice';
import { useSubmitPractice } from '../hooks/useSubmitPractice';
import { useTopicPractice } from '../hooks/useTopicPractice';
import type { PracticeQuestion, PracticeSubmitResponse } from '../types/practice';

const difficultyLabels = {
  BEGINNER: 'Beginner',
  INTERMEDIATE: 'Intermediate',
  ADVANCED: 'Advanced',
} as const;

function findOptionText(question: PracticeQuestion, optionId: string) {
  return question.options.find((option) => option.id === optionId)?.text ?? 'Unknown option';
}

export function PracticePage() {
  const { topicSlug } = useParams<{ topicSlug: string }>();
  const { data, error, isPending, isError } = useTopicPractice(topicSlug);
  const submitMutation = useSubmitPractice();
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [incompleteError, setIncompleteError] = useState<string | null>(null);
  const [result, setResult] = useState<PracticeSubmitResponse | null>(null);

  useEffect(() => {
    setQuestionIndex(0);
    setAnswers({});
    setIncompleteError(null);
    setResult(null);
    submitMutation.reset();
  }, [topicSlug]);

  const questions = data?.questions ?? [];
  const currentQuestion = questions[questionIndex];
  const isFirstQuestion = questionIndex <= 0;
  const isLastQuestion = questions.length > 0 && questionIndex >= questions.length - 1;
  const answeredCount = Object.keys(answers).length;
  const allAnswered = questions.length > 0 && answeredCount === questions.length;

  const questionById = useMemo(() => {
    return new Map(questions.map((question) => [question.id, question]));
  }, [questions]);

  function selectOption(questionId: string, optionId: string) {
    setIncompleteError(null);
    setAnswers((current) => ({ ...current, [questionId]: optionId }));
  }

  function handleSubmit() {
    if (!topicSlug || !allAnswered) {
      setIncompleteError('Answer every question before submitting.');
      return;
    }

    submitMutation.mutate(
      {
        topicSlug,
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
          setResult(payload);
        },
      },
    );
  }

  function handlePracticeAgain() {
    setQuestionIndex(0);
    setAnswers({});
    setIncompleteError(null);
    setResult(null);
    submitMutation.reset();
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

        {data && result ? (
          <PracticeResult
            topicName={data.topic.name}
            result={result}
            questionById={questionById}
            onPracticeAgain={handlePracticeAgain}
          />
        ) : null}

        {data && currentQuestion && !result ? (
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

function PracticeResult({
  topicName,
  result,
  questionById,
  onPracticeAgain,
}: {
  topicName: string;
  result: PracticeSubmitResponse;
  questionById: Map<string, PracticeQuestion>;
  onPracticeAgain: () => void;
}) {
  return (
    <>
      <h1>{topicName}</h1>
      <section className="practice-score">
        <p className="practice-score-value">
          {result.score.correct} / {result.score.total}
        </p>
        <p className="practice-score-percentage">{result.score.percentage}%</p>
      </section>

      <ul className="practice-results">
        {result.results.map((item, index) => {
          const question = questionById.get(item.questionId);

          return (
            <li
              key={item.questionId}
              className={item.correct ? 'practice-result practice-result-correct' : 'practice-result practice-result-incorrect'}
            >
              <p className="practice-result-status">{item.correct ? 'Correct' : 'Incorrect'}</p>
              <h2>
                {index + 1}. {question?.prompt ?? 'Question'}
              </h2>
              <p>
                <strong>Your answer: </strong>
                {question ? findOptionText(question, item.selectedOptionId) : item.selectedOptionId}
              </p>
              <p>
                <strong>Correct answer: </strong>
                {question ? findOptionText(question, item.correctOptionId) : item.correctOptionId}
              </p>
              <p className="practice-explanation">{item.explanation}</p>
            </li>
          );
        })}
      </ul>

      <div className="learning-nav">
        <button type="button" onClick={onPracticeAgain}>
          Practice again
        </button>
      </div>
    </>
  );
}
