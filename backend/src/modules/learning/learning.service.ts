import prisma from '../../config/database';
import { AppError } from '../../middleware/error.middleware';
import { Prisma, LearningCategory, LearningResourceType } from '@prisma/client';

export const create = async (userId: string, data: any) => {
  return prisma.learningEntry.create({
    data: {
      ...data,
      userId,
    },
  });
};

export const list = async (userId: string, q: any) => {
  const where: Prisma.LearningEntryWhereInput = { userId };

  if (q.category) {
    where.category = q.category as LearningCategory;
  }
  if (q.type) {
    where.type = q.type as LearningResourceType;
  }
  if (q.tag) {
    where.tags = { has: q.tag };
  }
  if (q.search) {
    where.OR = [
      { title: { contains: q.search, mode: 'insensitive' } },
      { content: { contains: q.search, mode: 'insensitive' } },
    ];
  }

  const [entries, total] = await Promise.all([
    prisma.learningEntry.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (Number(q.page || 1) - 1) * Number(q.limit || 20),
      take: Number(q.limit || 20),
    }),
    prisma.learningEntry.count({ where }),
  ]);

  return { entries, total };
};

export const getOne = async (userId: string, id: string) => {
  const entry = await prisma.learningEntry.findFirst({
    where: { id, userId },
  });
  if (!entry) throw new AppError('Learning entry not found', 404);
  return entry;
};

export const update = async (userId: string, id: string, data: any) => {
  const entry = await prisma.learningEntry.findFirst({
    where: { id, userId },
  });
  if (!entry) throw new AppError('Learning entry not found', 404);

  return prisma.learningEntry.update({
    where: { id },
    data,
  });
};

export const remove = async (userId: string, id: string) => {
  const entry = await prisma.learningEntry.findFirst({
    where: { id, userId },
  });
  if (!entry) throw new AppError('Learning entry not found', 404);

  await prisma.learningEntry.delete({
    where: { id },
  });
};
