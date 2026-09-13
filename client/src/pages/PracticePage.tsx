import { CircleAlert } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getSubmitPracticeErrorMessage, getTopicPracticeErrorMessage } from '../api/practice';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Skeleton } from '../components/ui/skeleton';
import { useKnowledgeBaseTopic } from '../hooks/useKnowledgeBaseTopic';
import { useStartPractice } from '../hooks/useStartPractice';
import { useSubmitPractice } from '../hooks/useSubmitPractice';
import { cn } from '../lib/utils';
import type { TopicPracticeResponse } from '../types/practice';

const difficultyLabels = {
  BEGINNER: 'Beginner',
  INTERMEDIATE: 'Intermediate',
  ADVANCED: 'Advanced',
} as const;

const MIN_PRACTICE_QUESTIONS = 1;
const MAX_PRACTICE_QUESTIONS = 8;

function parseQuestionCount(value: string) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) ? parsed : null;
}

function getQuestionCountMessage(input: {
  countInput: string;
  parsedCount: number | null;
  selectedCardCount: number;
}) {
  const { countInput, parsedCount, selectedCardCount } = input;

  if (selectedCardCount === 0) {
    return 'Select at least one document with knowledge cards.';
  }

  if (countInput.trim() === '' || parsedCount === null) {
    return 'Enter how many questions you want.';
  }

  if (parsedCount < MIN_PRACTICE_QUESTIONS) {
    return 'Enter at least 1 question.';
  }

  if (parsedCount > MAX_PRACTICE_QUESTIONS) {
    return `You can request at most ${MAX_PRACTICE_QUESTIONS} questions.`;
  }

  if (parsedCount > selectedCardCount) {
    return selectedCardCount === 1
      ? 'These knowledge cards can support at most 1 question.'
      : `These knowledge cards can support at most ${selectedCardCount} questions.`;
  }

  return `We'll generate ${parsedCount} questions from ${selectedCardCount} knowledge cards.`;
}

function createSubmissionId() {
  return crypto.randomUUID();
}

function displayDocumentName(filename: string) {
  return filename.replace(/\.pdf$/i, '');
}

export function PracticePage() {
  const { topicSlug } = useParams<{ topicSlug: string }>();
  const navigate = useNavigate();
  const topicQuery = useKnowledgeBaseTopic(topicSlug);
  const startMutation = useStartPractice(topicSlug);
  const submitMutation = useSubmitPractice();
  const [session, setSession] = useState<TopicPracticeResponse | null>(null);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[] | null>(null);
  const [countInput, setCountInput] = useState('5');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [incompleteError, setIncompleteError] = useState<string | null>(null);
  const submissionIdRef = useRef(createSubmissionId());

  const topic = topicQuery.data?.topic;
  const knowledgeCards = topicQuery.data?.knowledgeCards ?? [];
  const documents = topicQuery.data?.documents ?? [];
  const effectiveDocumentIds = selectedDocumentIds ?? documents.map((document) => document.id);

  useEffect(() => {
    setSession(null);
    setSelectedDocumentIds(null);
    setCountInput('5');
    setQuestionIndex(0);
    setAnswers({});
    setIncompleteError(null);
    submissionIdRef.current = createSubmissionId();
    submitMutation.reset();
    startMutation.reset();
  }, [topicSlug]);

  const selectedCardCount = useMemo(() => {
    if (documents.length === 0 || effectiveDocumentIds.length === documents.length) {
      return knowledgeCards.length;
    }

    const selected = new Set(effectiveDocumentIds);
    return knowledgeCards.filter((card) => card.documentId && selected.has(card.documentId)).length;
  }, [documents.length, effectiveDocumentIds, knowledgeCards]);

  const questions = session?.questions ?? [];
  const currentQuestion = questions[questionIndex];
  const isFirstQuestion = questionIndex <= 0;
  const isLastQuestion = questions.length > 0 && questionIndex >= questions.length - 1;
  const answeredCount = Object.keys(answers).length;
  const allAnswered = questions.length > 0 && answeredCount === questions.length;
  const parsedCount = parseQuestionCount(countInput);
  const countMessage = getQuestionCountMessage({
    countInput,
    parsedCount,
    selectedCardCount,
  });
  const countIsOverLimit =
    parsedCount !== null &&
    (parsedCount > MAX_PRACTICE_QUESTIONS || parsedCount > selectedCardCount);
  const canStart =
    Boolean(topicSlug) &&
    selectedCardCount > 0 &&
    effectiveDocumentIds.length > 0 &&
    parsedCount !== null &&
    parsedCount >= MIN_PRACTICE_QUESTIONS &&
    parsedCount <= MAX_PRACTICE_QUESTIONS &&
    parsedCount <= selectedCardCount;

  function toggleDocument(documentId: string) {
    const current = selectedDocumentIds ?? documents.map((document) => document.id);
    const next = current.includes(documentId)
      ? current.filter((id) => id !== documentId)
      : [...current, documentId];
    setSelectedDocumentIds(next);
  }

  function handleStart() {
    if (!topicSlug || startMutation.isPending || !canStart || parsedCount === null) {
      return;
    }

    startMutation.mutate(
      {
        count: parsedCount,
        documentIds: effectiveDocumentIds.length === documents.length ? undefined : effectiveDocumentIds,
      },
      {
        onSuccess: (payload) => {
          setSession(payload);
          setQuestionIndex(0);
          setAnswers({});
          setIncompleteError(null);
          submissionIdRef.current = createSubmissionId();
        },
      },
    );
  }

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
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-6">
      {topicQuery.isPending ? (
        <div className="grid gap-3">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : null}

      {topicQuery.isError ? (
        <Alert variant="destructive">
          <CircleAlert />
          <AlertDescription>{getTopicPracticeErrorMessage(topicQuery.error)}</AlertDescription>
        </Alert>
      ) : null}

      {topic && !session && !startMutation.isPending ? (
        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">{topic.name}</h1>
            <p className="text-muted-foreground">Choose what to practice before questions are generated.</p>
          </div>

          {documents.length > 1 ? (
            <section className="space-y-3">
              <h2 className="text-sm font-medium">Source documents</h2>
              <ul className="grid gap-2">
                {documents.map((document) => {
                  const cardCount = knowledgeCards.filter((card) => card.documentId === document.id).length;
                  const checked = effectiveDocumentIds.includes(document.id);

                  return (
                    <li key={document.id}>
                      <label className="flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-3 text-sm">
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={checked}
                          onChange={() => toggleDocument(document.id)}
                        />
                        <span className="min-w-0">
                          <span className="block break-words font-medium">{displayDocumentName(document.filename)}</span>
                          <span className="text-xs text-muted-foreground">
                            {cardCount === 1 ? '1 knowledge card' : `${cardCount} knowledge cards`}
                          </span>
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}

          <section className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="practice-question-count">Question count</Label>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  id="practice-question-count"
                  type="number"
                  min={MIN_PRACTICE_QUESTIONS}
                  max={MAX_PRACTICE_QUESTIONS}
                  inputMode="numeric"
                  className="w-24"
                  value={countInput}
                  onChange={(event) => setCountInput(event.target.value)}
                />
                <Button
                  type="button"
                  variant={parsedCount === MAX_PRACTICE_QUESTIONS ? 'default' : 'outline'}
                  onClick={() => setCountInput(String(MAX_PRACTICE_QUESTIONS))}
                >
                  {MAX_PRACTICE_QUESTIONS}
                </Button>
              </div>
            </div>
            {countIsOverLimit ? (
              <Alert>
                <CircleAlert />
                <AlertDescription>{countMessage}</AlertDescription>
              </Alert>
            ) : (
              <p className="text-sm text-muted-foreground">{countMessage}</p>
            )}
          </section>

          {startMutation.isError ? (
            <Alert variant="destructive">
              <CircleAlert />
              <AlertDescription>{getTopicPracticeErrorMessage(startMutation.error)}</AlertDescription>
            </Alert>
          ) : null}

          <Button type="button" disabled={!canStart} onClick={handleStart}>
            Generate and start
          </Button>
        </div>
      ) : null}

      {startMutation.isPending ? (
        <div className="grid gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{topic?.name ?? 'Practice'}</h1>
          <p className="text-sm text-muted-foreground">
            Generating practice questions from the knowledge cards you selected.
          </p>
          <Skeleton className="h-48 w-full" />
        </div>
      ) : null}

      {session && currentQuestion ? (
        <>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">{session.topic.name}</h1>
            <p className="text-sm text-muted-foreground">
              Question {questionIndex + 1} / {questions.length}
              <span className="ml-3">{answeredCount} answered</span>
            </p>
          </div>

          <Card>
            <CardHeader className="gap-3">
              <p className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
                <span>{difficultyLabels[currentQuestion.difficulty]}</span>
                {currentQuestion.tags.length > 0 ? (
                  <span>{currentQuestion.tags.map((tag) => tag.name).join(' · ')}</span>
                ) : null}
              </p>
              <CardTitle className="text-lg">{currentQuestion.prompt}</CardTitle>
            </CardHeader>
            <CardContent>
              <fieldset className="grid gap-2">
                <legend className="sr-only">Answer choices</legend>
                {currentQuestion.options.map((option) => {
                  const isSelected = answers[currentQuestion.id] === option.id;

                  return (
                    <label
                      key={option.id}
                      className={cn(
                        'flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-3 text-sm transition-colors',
                        isSelected ? 'border-foreground bg-accent' : 'border-border hover:bg-accent/40',
                      )}
                    >
                      <input
                        type="radio"
                        className="mt-1"
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
            </CardContent>
          </Card>

          {incompleteError ? (
            <Alert variant="destructive">
              <CircleAlert />
              <AlertDescription>{incompleteError}</AlertDescription>
            </Alert>
          ) : null}
          {submitMutation.isError ? (
            <Alert variant="destructive">
              <CircleAlert />
              <AlertDescription>{getSubmitPracticeErrorMessage(submitMutation.error)}</AlertDescription>
            </Alert>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={isFirstQuestion || submitMutation.isPending}
              onClick={() => setQuestionIndex((index) => index - 1)}
            >
              Previous
            </Button>
            {isLastQuestion ? (
              <Button type="button" disabled={submitMutation.isPending} onClick={handleSubmit}>
                {submitMutation.isPending ? 'Submitting...' : 'Submit'}
              </Button>
            ) : (
              <Button type="button" disabled={submitMutation.isPending} onClick={() => setQuestionIndex((index) => index + 1)}>
                Next
              </Button>
            )}
          </div>
        </>
      ) : null}
    </main>
  );
}
