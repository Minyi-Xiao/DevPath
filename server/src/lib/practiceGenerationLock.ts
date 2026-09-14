import { createHash } from 'node:crypto';
import { prisma } from './prisma';

function advisoryLockKey(lockName: string) {
  return createHash('sha256').update(lockName).digest().readBigInt64BE(0);
}

export async function withPracticeGenerationLock<T>(lockName: string, work: () => Promise<T>) {
  const key = advisoryLockKey(lockName);

  await prisma.$executeRaw`SELECT pg_advisory_lock(${key})`;

  try {
    return await work();
  } finally {
    await prisma.$executeRaw`SELECT pg_advisory_unlock(${key})`;
  }
}
