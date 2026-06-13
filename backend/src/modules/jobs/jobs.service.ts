import prisma from '../../config/database';
import { AppError } from '../../middleware/error.middleware';

export const create = async (userId: string, data: any) =>
  prisma.job.create({ data: { ...data, userId } });

export const list = async (userId: string, q: any) => {
  const where: any = { userId };
  if (q.status) where.status = q.status;
  const [jobs, total] = await Promise.all([
    prisma.job.findMany({ 
      where, 
      orderBy: { appliedDate: 'desc' }, 
      skip: (Number(q.page || 1) - 1) * Number(q.limit || 20), 
      take: Number(q.limit || 20) 
    }),
    prisma.job.count({ where }),
  ]);
  return { jobs, total };
};

export const update = async (userId: string, id: string, data: any) => {
  const job = await prisma.job.findFirst({ where: { id, userId } });
  if (!job) throw new AppError('Job not found.', 404);
  return prisma.job.update({ where: { id }, data });
};

export const remove = async (userId: string, id: string) => {
  const job = await prisma.job.findFirst({ where: { id, userId } });
  if (!job) throw new AppError('Job not found.', 404);
  await prisma.job.delete({ where: { id } });
};
