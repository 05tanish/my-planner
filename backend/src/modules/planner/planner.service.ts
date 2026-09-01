import prisma from '../../config/database';
import { AppError } from '../../middleware/error.middleware';
import { Prisma } from '@prisma/client';
import { sendHighPriorityTaskAlert } from '../../services/telegram.service';

export const createTask = async (userId: string, data: any) => {
  const payload = { ...data, userId };
  if (!payload.dueDate) {
    const now = new Date();
    // If before 4:00 AM, task belongs to the ongoing planner day (yesterday's date)
    if (now.getHours() < 4) {
      now.setDate(now.getDate() - 1);
    }
    payload.dueDate = now;
  }
  if (payload.status === 'DONE' && !payload.completedAt) {
    payload.completedAt = new Date();
  }
  const task = await prisma.task.create({ data: payload });
  
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
    where.OR = [
      { dueDate: { gte: start, lte: end } },
      { dueDate: null, createdAt: { gte: start, lte: end } }
    ];
  }

  const [tasks, total] = await Promise.all([
    prisma.task.findMany({ where, orderBy: [{ sortOrder: 'asc' }, { priority: 'desc' }, { dueDate: 'asc' }], skip: (query.page - 1) * query.limit, take: query.limit }),
    prisma.task.count({ where }),
  ]);
  return { tasks, pagination: { total, page: query.page, limit: query.limit, pages: Math.ceil(total / query.limit) } };
};

export const updateTask = async (userId: string, id: string, data: any) => {
  const task = await prisma.task.findFirst({ where: { id, userId } });
  if (!task) throw new AppError('Task not found.', 404);
  const payload = { ...data };
  
  if (payload.status === 'DONE' && task.status !== 'DONE') {
    if (!payload.completedAt) {
      payload.completedAt = new Date();
    }
    
    // Auto-update linked priority progress
    if (task.priorityId) {
      const priority = await prisma.priority.findUnique({ where: { id: task.priorityId } });
      if (priority) {
        // use task estimatedTime in hours, or default to priority's daily alloc
        const hoursToAdd = task.estimatedTime ? (task.estimatedTime / 60) : priority.dailyHoursAlloc;
        const newCompleted = Math.min(priority.hoursCompleted + hoursToAdd, priority.estimatedTotalHours);
        const progress = Math.min(Math.round((newCompleted / Math.max(priority.estimatedTotalHours, 1)) * 100), 100);
        
        await prisma.priority.update({
          where: { id: priority.id },
          data: { 
            hoursCompleted: newCompleted,
            progress,
            ...(progress >= 100 ? { status: 'COMPLETED', isActive: false, completedAt: new Date() } : {})
          }
        });
      }
    }
  }
  
  return prisma.task.update({ where: { id }, data: payload });
};

export const deleteTask = async (userId: string, id: string) => {
  const task = await prisma.task.findFirst({ where: { id, userId } });
  if (!task) throw new AppError('Task not found.', 404);
  await prisma.task.delete({ where: { id } });
};

export const getTodayTasks = async (userId: string) => {
  const now = new Date();
  // If before 4:00 AM, today's planner scope is the ongoing day starting yesterday
  if (now.getHours() < 4) {
    now.setDate(now.getDate() - 1);
  }
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return prisma.task.findMany({
    where: {
      userId,
      scope: 'DAILY',
      OR: [
        { dueDate: { gte: today, lt: tomorrow } },
        { dueDate: null, createdAt: { gte: today, lt: tomorrow } }
      ]
    },
    orderBy: [{ sortOrder: 'asc' }, { priority: 'desc' }, { createdAt: 'asc' }],
  });
};

export const moveTaskToNextDay = async (userId: string, id: string) => {
  const task = await prisma.task.findFirst({ where: { id, userId } });
  if (!task) throw new AppError('Task not found.', 404);

  const currentDue = task.dueDate ? new Date(task.dueDate) : new Date();
  currentDue.setHours(0, 0, 0, 0);
  const nextDay = new Date(currentDue);
  nextDay.setDate(nextDay.getDate() + 1);

  return prisma.task.update({ where: { id }, data: { dueDate: nextDay } });
};

export const bulkMoveTasksToNextDay = async (userId: string, ids: string[]) => {
  // Verify all tasks belong to user
  const tasks = await prisma.task.findMany({ where: { id: { in: ids }, userId } });
  if (tasks.length !== ids.length) throw new AppError('Some tasks not found.', 404);

  const results = await Promise.all(
    tasks.map(task => {
      const currentDue = task.dueDate ? new Date(task.dueDate) : new Date();
      currentDue.setHours(0, 0, 0, 0);
      const nextDay = new Date(currentDue);
      nextDay.setDate(nextDay.getDate() + 1);
      return prisma.task.update({ where: { id: task.id }, data: { dueDate: nextDay } });
    })
  );

  return { moved: results.length };
};

export const bulkDeleteTasks = async (userId: string, ids: string[]) => {
  const result = await prisma.task.deleteMany({
    where: { id: { in: ids }, userId },
  });
  return { deleted: result.count };
};

export const reorderTasks = async (userId: string, items: { id: string; sortOrder: number }[]) => {
  await prisma.$transaction(
    items.map(({ id, sortOrder }) =>
      prisma.task.updateMany({ where: { id, userId }, data: { sortOrder } })
    )
  );
  return { updated: items.length };
};

