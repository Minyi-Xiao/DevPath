import { PrismaClient, QuestionDifficulty, QuestionType } from '@prisma/client';

const prisma = new PrismaClient();

const topics = [
  {
    name: 'REST APIs',
    slug: 'rest-apis',
    description: 'Learn HTTP methods, resources, and status codes used to design and consume REST APIs.',
  },
  {
    name: 'SQL',
    slug: 'sql',
    description: 'Query, join, and model relational data with practical SQL for backend work.',
  },
  {
    name: 'Git',
    slug: 'git',
    description: 'Track changes, branch, and collaborate using Git workflows used on software teams.',
  },
] as const;

const learningCardsByTopicSlug: Record<
  (typeof topics)[number]['slug'],
  Array<{
    title: string;
    content: string;
    codeExample?: string;
    developerNote?: string;
    order: number;
  }>
> = {
  'rest-apis': [
    {
      order: 1,
      title: 'HTTP Methods',
      content:
        'REST APIs use HTTP methods to describe the action you want to perform on a resource. Treat the URL as the noun and the method as the verb.\n\nThe four methods you will use most often are GET (read), POST (create), PUT or PATCH (update), and DELETE (remove).',
      codeExample: 'GET    /api/topics\nPOST   /api/topics\nPUT    /api/topics/sql\nDELETE /api/topics/sql',
      developerNote: 'GET should not change server data. If calling an endpoint twice creates two records, it should not be a GET.',
    },
    {
      order: 2,
      title: 'HTTP Status Codes',
      content:
        'Status codes tell the client what happened. Learn the families first: 2xx means success, 4xx means the client request was wrong, and 5xx means the server failed.\n\nCommon codes: 200 OK, 201 Created, 400 Bad Request, 404 Not Found, and 500 Internal Server Error.',
      codeExample: 'HTTP/1.1 200 OK\nHTTP/1.1 201 Created\nHTTP/1.1 404 Not Found',
      developerNote: 'Return 404 when a specific resource does not exist. Return 400 when the request body or params are invalid.',
    },
    {
      order: 3,
      title: 'RESTful Resource Design',
      content:
        'Design URLs around resources, not actions. Use nouns for paths and let the HTTP method express the action.\n\nPrefer /api/topics/sql over /api/getTopic?name=sql. Keep nesting shallow and keep names consistent across the API.',
      codeExample: 'Good:  GET /api/topics/sql/cards\nAvoid: GET /api/getCardsForTopic?topic=sql',
      developerNote: 'Consistency matters more than perfection. Pick plural nouns for collections and stick with them.',
    },
  ],
  sql: [
    {
      order: 1,
      title: 'SELECT and WHERE',
      content:
        'SELECT chooses columns. WHERE filters rows. Start every query by asking two questions: which columns do I need, and which rows should remain?\n\nUse comparisons such as =, >, <, LIKE, and combine them with AND / OR. Be specific so you do not pull an entire table.',
      codeExample: 'SELECT name, slug\nFROM "Topic"\nWHERE slug = \'sql\';',
      developerNote: 'In production, use parameterized queries. Never concatenate user input into a SQL string.',
    },
    {
      order: 2,
      title: 'GROUP BY',
      content:
        'GROUP BY collapses rows that share the same value, then you run an aggregate such as COUNT, SUM, or AVG on each group.\n\nEvery selected column must either appear in the GROUP BY list or be wrapped in an aggregate function.',
      codeExample:
        'SELECT "topicId", COUNT(*) AS card_count\nFROM "LearningCard"\nGROUP BY "topicId";',
      developerNote: 'If PostgreSQL says a column "must appear in GROUP BY", you selected a raw column that is not grouped.',
    },
    {
      order: 3,
      title: 'JOIN basics',
      content:
        'JOIN combines rows from two tables using a related column, usually a foreign key.\n\nINNER JOIN keeps only matching rows. LEFT JOIN keeps every row from the left table and fills missing matches with NULL.',
      codeExample:
        'SELECT t.name, c.title\nFROM "Topic" t\nINNER JOIN "LearningCard" c ON c."topicId" = t.id\nORDER BY t.name, c."order";',
      developerNote: 'Start with INNER JOIN while you learn. Switch to LEFT JOIN when you also need parents that have no children.',
    },
  ],
  git: [
    {
      order: 1,
      title: 'Working Tree, Staging Area and Repository',
      content:
        'Git has three places a change can live:\n1. Working tree — the files you are editing now\n2. Staging area — the snapshot you have chosen for the next commit\n3. Repository — the saved history of commits\n\nYou edit files, stage the ones you want, then commit.',
      codeExample: 'git status\ngit add server/prisma/schema.prisma\ngit restore --staged server/prisma/schema.prisma',
      developerNote: 'git status is the map. Use it before and after every command until the three areas feel natural.',
    },
    {
      order: 2,
      title: 'Commit',
      content:
        'A commit is a snapshot of the staged files plus a message that explains why the change exists.\n\nWrite the message for future teammates, including yourself. Prefer a short subject that completes the sentence "This commit will..."',
      codeExample: 'git commit -m "Add LearningCard model and topic relation"',
      developerNote: 'Commit related changes together. Do not mix a feature, a refactor, and an unrelated fix in one commit.',
    },
    {
      order: 3,
      title: 'Branch and Merge',
      content:
        'A branch is a movable pointer to a commit. Create a branch for each piece of work so main stays stable.\n\nWhen the work is ready, merge the branch back. If the histories diverged, Git creates a merge commit that joins them.',
      codeExample: 'git switch -c feature/learning-cards\ngit switch main\ngit merge feature/learning-cards',
      developerNote: 'Update your branch from main before you merge. Resolve conflicts on the feature branch, then complete the merge.',
    },
  ],
};

const tags = [
  { name: 'HTTP Methods', slug: 'http-methods' },
  { name: 'Status Codes', slug: 'status-codes' },
  { name: 'Error Handling', slug: 'error-handling' },
  { name: 'Resource Design', slug: 'resource-design' },
  { name: 'SELECT Filtering', slug: 'select-filtering' },
  { name: 'Aggregation', slug: 'aggregation' },
  { name: 'Joins', slug: 'joins' },
  { name: 'Grouping', slug: 'grouping' },
  { name: 'Staging', slug: 'staging' },
  { name: 'Commits', slug: 'commits' },
  { name: 'Branches', slug: 'branches' },
  { name: 'Merging', slug: 'merging' },
] as const;

type SeedOption = {
  order: number;
  text: string;
  isCorrect: boolean;
};

type SeedQuestion = {
  order: number;
  type: QuestionType;
  prompt: string;
  difficulty: QuestionDifficulty;
  explanation: string;
  tagSlugs: Array<(typeof tags)[number]['slug']>;
  options: SeedOption[];
};

const questionsByTopicSlug: Record<(typeof topics)[number]['slug'], SeedQuestion[]> = {
  'rest-apis': [
    {
      order: 1,
      type: QuestionType.MULTIPLE_CHOICE,
      difficulty: QuestionDifficulty.BEGINNER,
      prompt: 'Which HTTP method should you use to read a resource without changing any server data?',
      explanation:
        'GET is a safe, read-only method. If calling an endpoint twice creates records or updates data, it should not be a GET.',
      tagSlugs: ['http-methods'],
      options: [
        { order: 1, text: 'GET', isCorrect: true },
        { order: 2, text: 'POST', isCorrect: false },
        { order: 3, text: 'PUT', isCorrect: false },
        { order: 4, text: 'DELETE', isCorrect: false },
      ],
    },
    {
      order: 2,
      type: QuestionType.MULTIPLE_CHOICE,
      difficulty: QuestionDifficulty.BEGINNER,
      prompt: 'A client POSTs a new topic and the server creates it successfully. Which status code is most appropriate?',
      explanation:
        '201 Created is the standard success status when a POST creates a new resource. 200 OK usually means a successful read or generic success, not a newly created record.',
      tagSlugs: ['status-codes'],
      options: [
        { order: 1, text: '200 OK', isCorrect: false },
        { order: 2, text: '201 Created', isCorrect: true },
        { order: 3, text: '204 No Content', isCorrect: false },
        { order: 4, text: '400 Bad Request', isCorrect: false },
      ],
    },
    {
      order: 3,
      type: QuestionType.MULTIPLE_CHOICE,
      difficulty: QuestionDifficulty.INTERMEDIATE,
      prompt: 'A client requests GET /api/topics/python, but that topic does not exist. What should the API return?',
      explanation:
        'Return 404 Not Found when a specific resource does not exist. 400 is for an invalid request shape, and 500 means the server itself failed.',
      tagSlugs: ['status-codes', 'error-handling'],
      options: [
        { order: 1, text: '400 Bad Request', isCorrect: false },
        { order: 2, text: '204 No Content', isCorrect: false },
        { order: 3, text: '404 Not Found', isCorrect: true },
        { order: 4, text: '500 Internal Server Error', isCorrect: false },
      ],
    },
    {
      order: 4,
      type: QuestionType.MULTIPLE_CHOICE,
      difficulty: QuestionDifficulty.INTERMEDIATE,
      prompt: 'Which URL best follows REST resource design for listing learning cards of the SQL topic?',
      explanation:
        'REST URLs should name resources, not actions. /api/topics/sql/cards uses nouns and nesting. Avoid action names such as getCards in the path or query string.',
      tagSlugs: ['resource-design'],
      options: [
        { order: 1, text: 'GET /api/getCards?topic=sql', isCorrect: false },
        { order: 2, text: 'GET /api/topics/sql/cards', isCorrect: true },
        { order: 3, text: 'GET /api/topics/sql/getCards', isCorrect: false },
        { order: 4, text: 'POST /api/topics/sql/cards/list', isCorrect: false },
      ],
    },
    {
      order: 5,
      type: QuestionType.MULTIPLE_CHOICE,
      difficulty: QuestionDifficulty.ADVANCED,
      prompt: 'A GET /api/topics endpoint creates a new analytics row on every call. What is the main design problem?',
      explanation:
        'GET must be safe: it should not change server data. Side effects such as inserting records belong on POST or another non-safe method.',
      tagSlugs: ['http-methods', 'error-handling'],
      options: [
        { order: 1, text: 'GET cannot include path parameters.', isCorrect: false },
        { order: 2, text: 'GET must always return 201 Created.', isCorrect: false },
        { order: 3, text: 'GET must send a JSON request body.', isCorrect: false },
        { order: 4, text: 'GET should not change server data.', isCorrect: true },
      ],
    },
  ],
  sql: [
    {
      order: 1,
      type: QuestionType.MULTIPLE_CHOICE,
      difficulty: QuestionDifficulty.BEGINNER,
      prompt: 'Which SQL clause filters individual rows before any grouping happens?',
      explanation:
        'WHERE filters rows first. GROUP BY then collapses the remaining rows, and HAVING filters groups after aggregation.',
      tagSlugs: ['select-filtering'],
      options: [
        { order: 1, text: 'WHERE', isCorrect: true },
        { order: 2, text: 'GROUP BY', isCorrect: false },
        { order: 3, text: 'HAVING', isCorrect: false },
        { order: 4, text: 'ORDER BY', isCorrect: false },
      ],
    },
    {
      order: 2,
      type: QuestionType.MULTIPLE_CHOICE,
      difficulty: QuestionDifficulty.INTERMEDIATE,
      prompt: 'Which query counts how many learning cards belong to each topic?',
      explanation:
        'COUNT(*) is an aggregate. To get one count per topic you must GROUP BY the topic id, not select every card row on its own.',
      tagSlugs: ['aggregation', 'grouping'],
      options: [
        {
          order: 1,
          text: 'SELECT "topicId", COUNT(*) AS card_count FROM "LearningCard" GROUP BY "topicId";',
          isCorrect: true,
        },
        {
          order: 2,
          text: 'SELECT "topicId", COUNT(*) AS card_count FROM "LearningCard";',
          isCorrect: false,
        },
        {
          order: 3,
          text: 'SELECT * FROM "LearningCard" WHERE COUNT(*) > 0;',
          isCorrect: false,
        },
        {
          order: 4,
          text: 'SELECT COUNT("topicId") FROM "LearningCard" WHERE "topicId" GROUP BY COUNT(*);',
          isCorrect: false,
        },
      ],
    },
    {
      order: 3,
      type: QuestionType.MULTIPLE_CHOICE,
      difficulty: QuestionDifficulty.BEGINNER,
      prompt: 'What does an INNER JOIN return?',
      explanation:
        'INNER JOIN keeps only rows that match in both tables. Rows without a match are dropped. Use LEFT JOIN when you also need unmatched parent rows.',
      tagSlugs: ['joins'],
      options: [
        { order: 1, text: 'Every row from both tables, matched or not.', isCorrect: false },
        { order: 2, text: 'Only rows that match in both tables.', isCorrect: true },
        { order: 3, text: 'Every row from the right table, even without a match.', isCorrect: false },
        { order: 4, text: 'A cartesian product of every possible pair of rows.', isCorrect: false },
      ],
    },
    {
      order: 4,
      type: QuestionType.MULTIPLE_CHOICE,
      difficulty: QuestionDifficulty.INTERMEDIATE,
      prompt: 'PostgreSQL errors that a selected column "must appear in the GROUP BY clause". What went wrong?',
      explanation:
        'Every selected column must either be in the GROUP BY list or be wrapped in an aggregate such as COUNT or SUM. A raw ungrouped column is invalid.',
      tagSlugs: ['grouping'],
      options: [
        { order: 1, text: 'The query used WHERE instead of HAVING.', isCorrect: false },
        { order: 2, text: 'The table name was quoted incorrectly.', isCorrect: false },
        { order: 3, text: 'A selected column was neither grouped nor aggregated.', isCorrect: true },
        { order: 4, text: 'GROUP BY can only be used with JOIN queries.', isCorrect: false },
      ],
    },
    {
      order: 5,
      type: QuestionType.MULTIPLE_CHOICE,
      difficulty: QuestionDifficulty.ADVANCED,
      prompt: 'You need every Topic row, including topics that currently have no learning cards. Which join should you use?',
      explanation:
        'LEFT JOIN from Topic to LearningCard keeps every topic. INNER JOIN would drop topics that have no matching cards.',
      tagSlugs: ['joins'],
      options: [
        { order: 1, text: 'INNER JOIN from Topic to LearningCard', isCorrect: false },
        { order: 2, text: 'LEFT JOIN from Topic to LearningCard', isCorrect: true },
        { order: 3, text: 'CROSS JOIN from Topic to LearningCard', isCorrect: false },
        { order: 4, text: 'RIGHT JOIN from LearningCard to Topic, then filter NULL topics', isCorrect: false },
      ],
    },
  ],
  git: [
    {
      order: 1,
      type: QuestionType.MULTIPLE_CHOICE,
      difficulty: QuestionDifficulty.BEGINNER,
      prompt: 'You edited a file but have not run git add yet. Where does that change live?',
      explanation:
        'Unstaged edits live in the working tree. git add copies a snapshot into the staging area; git commit then stores that snapshot in the repository.',
      tagSlugs: ['staging'],
      options: [
        { order: 1, text: 'The working tree', isCorrect: true },
        { order: 2, text: 'The staging area', isCorrect: false },
        { order: 3, text: 'The repository history', isCorrect: false },
        { order: 4, text: 'The remote default branch', isCorrect: false },
      ],
    },
    {
      order: 2,
      type: QuestionType.MULTIPLE_CHOICE,
      difficulty: QuestionDifficulty.BEGINNER,
      prompt: 'What does git add do?',
      explanation:
        'git add stages a snapshot of the chosen files for the next commit. It does not create a commit and it does not push to a remote.',
      tagSlugs: ['staging'],
      options: [
        { order: 1, text: 'It creates a commit with a generated message.', isCorrect: false },
        { order: 2, text: 'It copies the change into the staging area for the next commit.', isCorrect: true },
        { order: 3, text: 'It pushes local commits to origin.', isCorrect: false },
        { order: 4, text: 'It discards uncommitted changes in the working tree.', isCorrect: false },
      ],
    },
    {
      order: 3,
      type: QuestionType.MULTIPLE_CHOICE,
      difficulty: QuestionDifficulty.INTERMEDIATE,
      prompt: 'Which statement best describes a Git commit?',
      explanation:
        'A commit is a snapshot of the staged files plus a message that explains why the change exists. It is not just a diff, and it is not a remote-only object.',
      tagSlugs: ['commits'],
      options: [
        { order: 1, text: 'A snapshot of staged files plus a message explaining why the change exists.', isCorrect: true },
        { order: 2, text: 'A mandatory backup stored only on the remote.', isCorrect: false },
        { order: 3, text: 'A list of files that Git should ignore.', isCorrect: false },
        { order: 4, text: 'A temporary stash that expires after 30 days.', isCorrect: false },
      ],
    },
    {
      order: 4,
      type: QuestionType.MULTIPLE_CHOICE,
      difficulty: QuestionDifficulty.INTERMEDIATE,
      prompt: 'What is a Git branch?',
      explanation:
        'A branch is a movable pointer to a commit. Creating a branch lets you do work without moving main until you merge.',
      tagSlugs: ['branches'],
      options: [
        { order: 1, text: 'A copy of the entire .git directory on disk.', isCorrect: false },
        { order: 2, text: 'A remote-only tag that cannot be updated.', isCorrect: false },
        { order: 3, text: 'A movable pointer to a commit.', isCorrect: true },
        { order: 4, text: 'A required folder named after each teammate.', isCorrect: false },
      ],
    },
    {
      order: 5,
      type: QuestionType.MULTIPLE_CHOICE,
      difficulty: QuestionDifficulty.ADVANCED,
      prompt: 'Your feature branch is ready. What is the usual next step to land the work on main?',
      explanation:
        'Merge the feature branch into main (or open a pull request that does the same). Prefer resolving conflicts on the feature branch before completing the merge.',
      tagSlugs: ['merging', 'branches'],
      options: [
        { order: 1, text: 'Delete main and rename the feature branch.', isCorrect: false },
        { order: 2, text: 'Run git add . on main without committing.', isCorrect: false },
        { order: 3, text: 'Reset main to the first commit on the feature branch.', isCorrect: false },
        { order: 4, text: 'Merge the feature branch into main.', isCorrect: true },
      ],
    },
  ],
};

function assertExactlyOneCorrectOption(question: SeedQuestion) {
  if (question.type !== QuestionType.MULTIPLE_CHOICE) {
    return;
  }

  const correctCount = question.options.filter((option) => option.isCorrect).length;

  if (question.options.length !== 4 || correctCount !== 1) {
    throw new Error(`MCQ "${question.prompt}" must have 4 options and exactly one correct answer.`);
  }
}

async function seedTopicsAndCards() {
  for (const topic of topics) {
    const savedTopic = await prisma.topic.upsert({
      where: { slug: topic.slug },
      update: {
        name: topic.name,
        description: topic.description,
      },
      create: topic,
    });

    for (const card of learningCardsByTopicSlug[topic.slug]) {
      await prisma.learningCard.upsert({
        where: {
          topicId_order: {
            topicId: savedTopic.id,
            order: card.order,
          },
        },
        update: {
          title: card.title,
          content: card.content,
          codeExample: card.codeExample ?? null,
          developerNote: card.developerNote ?? null,
        },
        create: {
          topicId: savedTopic.id,
          title: card.title,
          content: card.content,
          codeExample: card.codeExample,
          developerNote: card.developerNote,
          order: card.order,
        },
      });
    }
  }
}

async function seedTags() {
  for (const tag of tags) {
    await prisma.tag.upsert({
      where: { slug: tag.slug },
      update: { name: tag.name },
      create: tag,
    });
  }
}

async function seedQuestions() {
  for (const topic of topics) {
    const savedTopic = await prisma.topic.findUniqueOrThrow({
      where: { slug: topic.slug },
    });

    for (const question of questionsByTopicSlug[topic.slug]) {
      assertExactlyOneCorrectOption(question);

      const savedQuestion = await prisma.question.upsert({
        where: {
          topicId_order: {
            topicId: savedTopic.id,
            order: question.order,
          },
        },
        update: {
          type: question.type,
          prompt: question.prompt,
          difficulty: question.difficulty,
          explanation: question.explanation,
          tags: {
            set: question.tagSlugs.map((slug) => ({ slug })),
          },
        },
        create: {
          topicId: savedTopic.id,
          type: question.type,
          prompt: question.prompt,
          difficulty: question.difficulty,
          explanation: question.explanation,
          order: question.order,
          tags: {
            connect: question.tagSlugs.map((slug) => ({ slug })),
          },
        },
      });

      for (const option of question.options) {
        await prisma.questionOption.upsert({
          where: {
            questionId_order: {
              questionId: savedQuestion.id,
              order: option.order,
            },
          },
          update: {
            text: option.text,
            isCorrect: option.isCorrect,
          },
          create: {
            questionId: savedQuestion.id,
            text: option.text,
            isCorrect: option.isCorrect,
            order: option.order,
          },
        });
      }
    }
  }
}

async function seed() {
  await seedTopicsAndCards();
  await seedTags();
  await seedQuestions();
}

seed()
  .then(async () => {
    console.log('Seeded topics, learning cards, tags, and practice questions: REST APIs, SQL, Git');
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
