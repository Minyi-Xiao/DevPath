import { Prisma } from '@prisma/client';
import { HttpError } from '../lib/httpError';
import { hashPassword, verifyPassword } from '../lib/password';
import { prisma } from '../lib/prisma';

function toPublicUser(user: { id: string; email: string; createdAt: Date }) {
  return {
    id: user.id,
    email: user.email,
    createdAt: user.createdAt,
  };
}

function isUniqueConstraintError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function registerUser(email: string, password: string) {
  const normalisedEmail = normalizeEmail(email);
  const passwordHash = await hashPassword(password);

  try {
    const user = await prisma.user.create({
      data: {
        email: normalisedEmail,
        passwordHash,
      },
      select: {
        id: true,
        email: true,
        createdAt: true,
      },
    });

    return toPublicUser(user);
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new HttpError(409, 'Email is already registered');
    }

    throw error;
  }
}

export async function loginUser(email: string, password: string) {
  const normalisedEmail = normalizeEmail(email);
  const user = await prisma.user.findUnique({
    where: { email: normalisedEmail },
  });

  if (!user) {
    throw new HttpError(401, 'Invalid email or password');
  }

  const passwordMatches = await verifyPassword(password, user.passwordHash);

  if (!passwordMatches) {
    throw new HttpError(401, 'Invalid email or password');
  }

  return toPublicUser(user);
}

export async function getCurrentUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw new HttpError(401, 'Authentication required');
  }

  return toPublicUser(user);
}
