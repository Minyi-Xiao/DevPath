import { PrismaClient } from '@prisma/client';

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

seedTopicsAndCards()
  .then(async () => {
    console.log('Seeded topics and learning cards: REST APIs, SQL, Git');
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
