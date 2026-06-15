import prisma from '../../config/database';
import { AppError } from '../../middleware/error.middleware';
import { Prisma } from '@prisma/client';
import { sendHighPriorityTaskAlert } from '../../services/telegram.service';

export const createTask = async (userId: string, data: any) => {
  const task = await prisma.task.create({ data: { ...data, userId } });
  
  // Send Telegram alert for high/critical priority tasks
  if (data.priority === 'HIGH' || data.priority === 'CRITICAL') {
    try {
      const profile = await prisma.profile.findUnique({
        where: { userId },
        select: { telegramChatId: true, notifTelegram: true }
      });
      
      if (profile?.telegramChatId && profile?.notifTelegram) {
        await sendHighPriorityTaskAlert(
          profile.telegramChatId,
          task.title,
          data.priority
        );
      }
    } catch (error) {
      console.error('Failed to send high priority task alert:', error);
      // Don't fail task creation if notification fails
    }
  }
  
  return task;
};

export const getTasks = async (
  userId: string,
  query: { scope?: string; status?: string; category?: string; search?: string; page: number; limit: number; date?: string }
) => {
  const where: Prisma.TaskWhereInput = { userId };
  if (query.scope) where.scope = query.scope as any;
  if (query.status) where.status = query.status as any;
  if (query.category) where.category = query.category;
  if (query.search) where.title = { contains: query.search, mode: 'insensitive' };

  if (query.date) {
    const start = new Date(query.date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(query.date);
    end.setHours(23, 59, 59, 999);
    where.dueDate = {
      gte: start,
      lte: end,
    };
  }

  const [tasks, total] = await Promise.all([
    prisma.task.findMany({ where, orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }], skip: (query.page - 1) * query.limit, take: query.limit }),
    prisma.task.count({ where }),
  ]);
  return { tasks, pagination: { total, page: query.page, limit: query.limit, pages: Math.ceil(total / query.limit) } };
};

export const updateTask = async (userId: string, id: string, data: any) => {
  const task = await prisma.task.findFirst({ where: { id, userId } });
  if (!task) throw new AppError('Task not found.', 404);
  return prisma.task.update({ where: { id }, data });
};

export const deleteTask = async (userId: string, id: string) => {
  const task = await prisma.task.findFirst({ where: { id, userId } });
  if (!task) throw new AppError('Task not found.', 404);
  await prisma.task.delete({ where: { id } });
};

export const getTodayTasks = async (userId: string) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return prisma.task.findMany({
    where: {
      userId,
      scope: 'DAILY',
      status: { not: 'DONE' },
    },
    orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
  });
};
