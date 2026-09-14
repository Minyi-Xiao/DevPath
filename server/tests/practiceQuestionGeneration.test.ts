import { QuestionDifficulty } from '@prisma/client';
import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { setAiProviderForTests } from '../src/ai/createAiProvider';
import type { AiProvider } from '../src/ai/types';
import { DocumentErrorCode } from '../src/lib/documentLimits';
import { HttpError } from '../src/lib/httpError';
import type { DraftKnowledgeCard } from '../src/services/knowledgeExtractionService';
import {
  generatePracticeQuestions,
  setPracticeQuestionGeneratorForTests,
} from '../src/services/practiceQuestionGenerationService';

afterEach(() => {
  setAiProviderForTests(null);
  setPracticeQuestionGeneratorForTests(null);
});

const cards: DraftKnowledgeCard[] = [
  { title: 'useEffect cleanup', content: 'Cleanup runs before the next effect.', codeExample: null, sourceRef: 'p.1' },
  { title: 'Stale closures', content: 'Effects capture render values.', codeExample: null, sourceRef: 'p.2' },
  { title: 'Dependency arrays', content: 'List every reactive value the effect reads.', codeExample: null, sourceRef: null },
];

function questionPayload(count: number) {
  return {
    questions: Array.from({ length: count }, (_, index) => ({
      prompt: `What should you remember about card ${index + 1}?`,
      difficulty: 'BEGINNER',
      explanation: `Card ${index + 1} covers a reusable hook rule.`,
      options: [
        { text: `Correct ${index + 1}`, isCorrect: true },
        { text: `Wrong A ${index + 1}`, isCorrect: false },
        { text: `Wrong B ${index + 1}`, isCorrect: false },
        { text: `Wrong C ${index + 1}`, isCorrect: false },
      ],
    })),
  };
}

function providerReturning(text: string): AiProvider {
  return {
    name: 'openai',
    async complete() {
      return { text };
    },
  };
}

describe('practice question generation', () => {
  it('parses valid provider JSON into practice questions', async () => {
    setAiProviderForTests(providerReturning(JSON.stringify(questionPayload(3))));

    const questions = await generatePracticeQuestions({
      topicName: 'React Fundamentals',
      cards,
    });

    assert.equal(questions.length, 3);
    assert.equal(questions[0]?.difficulty, QuestionDifficulty.BEGINNER);
    assert.equal(questions[0]?.options.filter((option) => option.isCorrect).length, 1);
    assert.equal(questions[0]?.options.length, 4);
    assert.equal(questions[0]?.sourceCardNumber, 1);
    assert.equal(questions[1]?.sourceCardNumber, 2);
    assert.equal(questions[2]?.sourceCardNumber, 3);
  });

  it('accepts fenced JSON, lowercase difficulty, and string booleans', async () => {
    const payload = questionPayload(3);
    payload.questions[0] = {
      ...payload.questions[0]!,
      difficulty: 'beginner',
      options: [
        { text: 'Correct 1', isCorrect: 'true' as unknown as boolean },
        { text: 'Wrong A 1', isCorrect: 'false' as unknown as boolean },
        { text: 'Wrong B 1', isCorrect: false },
        { text: 'Wrong C 1', isCorrect: false },
      ],
    };

    setAiProviderForTests(
      providerReturning(`Here you go:\n\`\`\`json\n${JSON.stringify(payload)}\n\`\`\``),
    );

    const questions = await generatePracticeQuestions({
      topicName: 'React Fundamentals',
      cards,
    });

    assert.equal(questions.length, 3);
    assert.equal(questions[0]?.difficulty, QuestionDifficulty.BEGINNER);
    assert.equal(questions[0]?.options.filter((option) => option.isCorrect).length, 1);
  });

  it('accepts a top-level questions array from the provider', async () => {
    setAiProviderForTests(providerReturning(JSON.stringify(questionPayload(3).questions)));

    const questions = await generatePracticeQuestions({
      topicName: 'React Fundamentals',
      cards,
    });

    assert.equal(questions.length, 3);
  });

  it('rejects invalid JSON from the provider', async () => {
    setAiProviderForTests(providerReturning('not-json'));

    await assert.rejects(
      () => generatePracticeQuestions({ topicName: 'React Fundamentals', cards }),
      (error: unknown) =>
        error instanceof HttpError && error.errorCode === DocumentErrorCode.INVALID_AI_OUTPUT,
    );
  });

  it('rejects questions that do not have exactly one correct option', async () => {
    const payload = questionPayload(3);
    payload.questions[0] = {
      ...payload.questions[0]!,
      options: [
        { text: 'A', isCorrect: true },
        { text: 'B', isCorrect: true },
        { text: 'C', isCorrect: false },
        { text: 'D', isCorrect: false },
      ],
    };
    setAiProviderForTests(providerReturning(JSON.stringify(payload)));

    await assert.rejects(
      () => generatePracticeQuestions({ topicName: 'React Fundamentals', cards }),
      (error: unknown) =>
        error instanceof HttpError && error.errorCode === DocumentErrorCode.INVALID_AI_OUTPUT,
    );
  });

  it('returns exactly the requested question count', async () => {
    const manyCards = Array.from({ length: 8 }, (_, index) => ({
      title: `Card ${index + 1}`,
      content: `Knowledge unit ${index + 1}.`,
      codeExample: null,
      sourceRef: null,
    }));
    setAiProviderForTests(providerReturning(JSON.stringify(questionPayload(5))));

    const questions = await generatePracticeQuestions({
      topicName: 'React Fundamentals',
      cards: manyCards,
      requestedCount: 5,
    });

    assert.equal(questions.length, 5);
  });

  it('treats fewer questions than requested as a quality failure', async () => {
    setAiProviderForTests(providerReturning(JSON.stringify(questionPayload(3))));

    await assert.rejects(
      () =>
        generatePracticeQuestions({
          topicName: 'React Fundamentals',
          cards: [
            ...cards,
            { title: 'Effects', content: 'Effects run after paint.', codeExample: null, sourceRef: null },
            { title: 'Renders', content: 'A render produces UI.', codeExample: null, sourceRef: null },
          ],
          requestedCount: 5,
        }),
      (error: unknown) => error instanceof HttpError && error.errorCode === DocumentErrorCode.TOO_FEW_QUESTIONS,
    );
  });

  it('caps questions at 8', async () => {
    const manyCards = Array.from({ length: 12 }, (_, index) => ({
      title: `Card ${index + 1}`,
      content: `Knowledge unit ${index + 1}.`,
      codeExample: null,
      sourceRef: null,
    }));
    setAiProviderForTests(providerReturning(JSON.stringify(questionPayload(12))));

    const questions = await generatePracticeQuestions({
      topicName: 'Long Topic',
      cards: manyCards,
    });

    assert.equal(questions.length, 8);
  });

  it('binds questions to the cited card numbers', async () => {
    const orderedCards = [
      { title: 'Cleanup', content: 'Cleanup runs first.', codeExample: null, sourceRef: null, order: 4 },
      { title: 'Closures', content: 'Effects capture values.', codeExample: null, sourceRef: null, order: 7 },
      { title: 'Deps', content: 'List reactive values.', codeExample: null, sourceRef: null, order: 9 },
    ];
    const payload = {
      questions: [
        {
          prompt: 'What do effects capture?',
          difficulty: 'INTERMEDIATE',
          explanation: 'Effects capture render values.',
          sourceCard: 7,
          options: [
            { text: 'Render values', isCorrect: true },
            { text: 'Nothing', isCorrect: false },
            { text: 'Globals', isCorrect: false },
            { text: 'Only props', isCorrect: false },
          ],
        },
        {
          prompt: 'When does cleanup run?',
          difficulty: 'BEGINNER',
          explanation: 'Cleanup runs first.',
          sourceCard: 'Card 4',
          options: [
            { text: 'Before the next effect', isCorrect: true },
            { text: 'Never', isCorrect: false },
            { text: 'Only in tests', isCorrect: false },
            { text: 'On first paint only', isCorrect: false },
          ],
        },
        {
          prompt: 'What belongs in the dependency array?',
          difficulty: 'BEGINNER',
          explanation: 'List every reactive value.',
          sourceCard: 9,
          options: [
            { text: 'Every reactive value', isCorrect: true },
            { text: 'Only functions', isCorrect: false },
            { text: 'Only primitives', isCorrect: false },
            { text: 'Nothing', isCorrect: false },
          ],
        },
      ],
    };
    setAiProviderForTests(providerReturning(JSON.stringify(payload)));

    const questions = await generatePracticeQuestions({
      topicName: 'React Fundamentals',
      cards: orderedCards,
    });

    assert.deepEqual(
      questions.map((question) => question.sourceCardNumber),
      [7, 4, 9],
    );
  });

  it('repairs missing source cards onto unused numbered cards', async () => {
    setAiProviderForTests(providerReturning(JSON.stringify(questionPayload(3))));

    const questions = await generatePracticeQuestions({
      topicName: 'React Fundamentals',
      cards,
    });

    assert.deepEqual(
      questions.map((question) => question.sourceCardNumber).sort((left, right) => left - right),
      [1, 2, 3],
    );
  });
});
