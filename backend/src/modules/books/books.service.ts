import prisma from '../../config/database';
import { AppError } from '../../middleware/error.middleware';
import { Prisma, BookCategory, ReadingStatus } from '@prisma/client';

export const create = async (userId: string, data: any) => {
  return prisma.book.create({
    data: {
      ...data,
      userId,
    },
  });
};

export const list = async (userId: string, q: any) => {
  const where: Prisma.BookWhereInput = { userId };

  if (q.category) {
    where.category = q.category as BookCategory;
  }
  if (q.status) {
    where.readingStatus = q.status as ReadingStatus;
  }
  if (q.search) {
    where.OR = [
      { title: { contains: q.search, mode: 'insensitive' } },
      { author: { contains: q.search, mode: 'insensitive' } },
    ];
  }

  const [books, total] = await Promise.all([
    prisma.book.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip: (Number(q.page || 1) - 1) * Number(q.limit || 20),
      take: Number(q.limit || 20),
    }),
    prisma.book.count({ where }),
  ]);

  return { books, total };
};

export const getOne = async (userId: string, id: string) => {
  const book = await prisma.book.findFirst({
    where: { id, userId },
  });
  if (!book) throw new AppError('Book not found', 404);
  return book;
};

export const update = async (userId: string, id: string, data: any) => {
  const book = await prisma.book.findFirst({
    where: { id, userId },
  });
  if (!book) throw new AppError('Book not found', 404);

  // If readingStatus is updated to COMPLETED, check if totalPages is set and set currentPage to it
  if (data.readingStatus === 'COMPLETED' && book.totalPages) {
    data.currentPage = book.totalPages;
  }

  return prisma.book.update({
    where: { id },
    data,
  });
};

export const remove = async (userId: string, id: string) => {
  const book = await prisma.book.findFirst({
    where: { id, userId },
  });
  if (!book) throw new AppError('Book not found', 404);

  await prisma.book.delete({
    where: { id },
  });
};
