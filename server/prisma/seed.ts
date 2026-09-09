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

async function seedTopics() {
  for (const topic of topics) {
    await prisma.topic.upsert({
      where: { slug: topic.slug },
      update: {
        name: topic.name,
        description: topic.description,
      },
      create: topic,
    });
  }
}

seedTopics()
  .then(async () => {
    console.log('Seeded topics: REST APIs, SQL, Git');
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
