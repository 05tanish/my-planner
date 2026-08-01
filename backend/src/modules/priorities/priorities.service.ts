import prisma from '../../config/database';
import { AppError } from '../../middleware/error.middleware';
import { Prisma } from '@prisma/client';

// Computed fields appended to every priority returned from the API
function withComputedFields(p: any) {
  const remainingHours = Math.max(p.estimatedTotalHours - p.hoursCompleted, 0);
  const remainingDays = p.dailyHoursAlloc > 0
    ? Math.ceil(remainingHours / p.dailyHoursAlloc)
    : null;
  const estimatedFinishDate = remainingDays !== null
    ? new Date(Date.now() + remainingDays * 86400000).toISOString()
    : null;
  return { ...p, remainingHours, remainingDays, estimatedFinishDate };
}

export const createPriority = async (userId: string, data: any) => {
  // Get next queue position
  const maxPos = await prisma.priority.aggregate({
    where: { userId },
    _max: { queuePosition: true },
  });
  const nextPos = (maxPos._max.queuePosition ?? -1) + 1;

  // Auto-activate if this is the first priority
  const existingActive = await prisma.priority.findFirst({
    where: { userId, isActive: true },
  });

  const priority = await prisma.priority.create({
    data: {
      userId,
      title: data.title,
      description: data.description || null,
      category: data.category || null,
      priorityLevel: data.priorityLevel || 'MEDIUM',
      status: !existingActive ? 'IN_PROGRESS' : (data.status || 'NOT_STARTED'),
      estimatedTotalHours: data.estimatedTotalHours || 0,
      hoursCompleted: data.hoursCompleted || 0,
      dailyHoursAlloc: data.dailyHoursAlloc || 1,
      progress: data.progress || 0,
      deadline: data.deadline ? new Date(data.deadline) : null,
      queuePosition: nextPos,
      isActive: !existingActive,
    },
  });

  return withComputedFields(priority);
};

export const getPriorities = async (
  userId: string,
  query: {
    status?: string;
    category?: string;
    priorityLevel?: string;
    search?: string;
    sort?: string;
    page: number;
    limit: number;
  }
) => {
  const where: Prisma.PriorityWhereInput = { userId };

  if (query.status) where.status = query.status as any;
  if (query.category) where.category = query.category;
  if (query.priorityLevel) where.priorityLevel = query.priorityLevel as any;
  if (query.search) where.title = { contains: query.search, mode: 'insensitive' };

  // Determine sort order
  let orderBy: Prisma.PriorityOrderByWithRelationInput[] = [{ queuePosition: 'asc' }];
  switch (query.sort) {
    case 'deadline':
      orderBy = [{ deadline: 'asc' }, { queuePosition: 'asc' }];
      break;
    case 'progress':
      orderBy = [{ progress: 'desc' }, { queuePosition: 'asc' }];
      break;
    case 'hoursRemaining':
      // Sort by estimated - completed ascending (least remaining first)
      orderBy = [{ estimatedTotalHours: 'asc' }, { queuePosition: 'asc' }];
      break;
    case 'createdAt':
      orderBy = [{ createdAt: 'desc' }];
      break;
    default:
      orderBy = [{ queuePosition: 'asc' }];
  }

  const [priorities, total] = await Promise.all([
    prisma.priority.findMany({
      where,
      orderBy,
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.priority.count({ where }),
  ]);

  return {
    priorities: priorities.map(withComputedFields),
    pagination: {
      total,
      page: query.page,
      limit: query.limit,
      pages: Math.ceil(total / query.limit),
    },
  };
};

export const getPriorityById = async (userId: string, id: string) => {
  const priority = await prisma.priority.findFirst({ where: { id, userId } });
  if (!priority) throw new AppError('Priority not found.', 404);
  return withComputedFields(priority);
};

export const updatePriority = async (userId: string, id: string, data: any) => {
  const priority = await prisma.priority.findFirst({ where: { id, userId } });
  if (!priority) throw new AppError('Priority not found.', 404);

  const payload: any = {};

  // Simple field updates
  if (data.title !== undefined) payload.title = data.title;
  if (data.description !== undefined) payload.description = data.description;
  if (data.category !== undefined) payload.category = data.category;
  if (data.priorityLevel !== undefined) payload.priorityLevel = data.priorityLevel;
  if (data.estimatedTotalHours !== undefined) payload.estimatedTotalHours = data.estimatedTotalHours;
  if (data.hoursCompleted !== undefined) payload.hoursCompleted = data.hoursCompleted;
  if (data.dailyHoursAlloc !== undefined) payload.dailyHoursAlloc = data.dailyHoursAlloc;
  if (data.progress !== undefined) payload.progress = data.progress;
  if (data.deadline !== undefined) payload.deadline = data.deadline ? new Date(data.deadline) : null;

  // Status transitions
  if (data.status !== undefined) {
    payload.status = data.status;
    if (data.status === 'IN_PROGRESS' && priority.status !== 'IN_PROGRESS') {
      payload.isActive = true;
    }
    if (data.status === 'PAUSED') {
      payload.isActive = false;
    }
    if (data.status === 'NOT_STARTED') {
      payload.isActive = false;
    }
  }

  const updated = await prisma.priority.update({ where: { id }, data: payload });
  return withComputedFields(updated);
};

export const deletePriority = async (userId: string, id: string) => {
  const priority = await prisma.priority.findFirst({ where: { id, userId } });
  if (!priority) throw new AppError('Priority not found.', 404);

  await prisma.priority.delete({ where: { id } });

  // Re-order remaining queue positions
  const remaining = await prisma.priority.findMany({
    where: { userId },
    orderBy: { queuePosition: 'asc' },
  });

  if (remaining.length > 0) {
    await prisma.$transaction(
      remaining.map((p, idx) =>
        prisma.priority.update({ where: { id: p.id }, data: { queuePosition: idx } })
      )
    );

    // If the deleted item was active, activate the next one
    if (priority.isActive) {
      const nextActive = await prisma.priority.findFirst({
        where: { userId, status: { in: ['NOT_STARTED', 'PAUSED'] } },
        orderBy: { queuePosition: 'asc' },
      });
      if (nextActive) {
        await prisma.priority.update({
          where: { id: nextActive.id },
          data: { isActive: true, status: 'IN_PROGRESS' },
        });
      }
    }
  }
};

export const completePriority = async (userId: string, id: string) => {
  const priority = await prisma.priority.findFirst({ where: { id, userId } });
  if (!priority) throw new AppError('Priority not found.', 404);

  const completed = await prisma.priority.update({
    where: { id },
    data: {
      status: 'COMPLETED',
      isActive: false,
      progress: 100,
      hoursCompleted: priority.estimatedTotalHours,
      completedAt: new Date(),
    },
  });

  // Auto-activate the next queued priority
  const nextInQueue = await prisma.priority.findFirst({
    where: {
      userId,
      status: { in: ['NOT_STARTED', 'PAUSED'] },
      id: { not: id },
    },
    orderBy: { queuePosition: 'asc' },
  });

  if (nextInQueue) {
    await prisma.priority.update({
      where: { id: nextInQueue.id },
      data: { isActive: true, status: 'IN_PROGRESS' },
    });
  }

  return withComputedFields(completed);
};

export const reorderPriorities = async (
  userId: string,
  items: { id: string; queuePosition: number }[]
) => {
  await prisma.$transaction(
    items.map(({ id, queuePosition }) =>
      prisma.priority.updateMany({ where: { id, userId }, data: { queuePosition } })
    )
  );
  return { updated: items.length };
};

export const duplicatePriority = async (userId: string, id: string) => {
  const source = await prisma.priority.findFirst({ where: { id, userId } });
  if (!source) throw new AppError('Priority not found.', 404);

  const maxPos = await prisma.priority.aggregate({
    where: { userId },
    _max: { queuePosition: true },
  });
  const nextPos = (maxPos._max.queuePosition ?? -1) + 1;

  const dup = await prisma.priority.create({
    data: {
      userId,
      title: `${source.title} (copy)`,
      description: source.description,
      category: source.category,
      priorityLevel: source.priorityLevel,
      status: 'NOT_STARTED',
      estimatedTotalHours: source.estimatedTotalHours,
      hoursCompleted: 0,
      dailyHoursAlloc: source.dailyHoursAlloc,
      progress: 0,
      deadline: source.deadline,
      queuePosition: nextPos,
      isActive: false,
    },
  });

  return withComputedFields(dup);
};

export const getStats = async (userId: string) => {
  const [activePriority, allPriorities] = await Promise.all([
    prisma.priority.findFirst({
      where: { userId, isActive: true },
    }),
    prisma.priority.findMany({
      where: { userId },
      orderBy: { queuePosition: 'asc' },
    }),
  ]);

  const completed = allPriorities.filter(p => p.status === 'COMPLETED');
  const inQueue = allPriorities.filter(p => p.status !== 'COMPLETED' && p.status !== 'ARCHIVED');
  const nextPriority = inQueue.find(p => !p.isActive) || null;

  const todayPlannedHours = activePriority?.dailyHoursAlloc || 0;

  const totalRemainingHours = inQueue.reduce(
    (sum, p) => sum + Math.max(p.estimatedTotalHours - p.hoursCompleted, 0),
    0
  );

  const totalEstimated = allPriorities.reduce((sum, p) => sum + p.estimatedTotalHours, 0);
  const totalDone = allPriorities.reduce((sum, p) => sum + p.hoursCompleted, 0);
  const overallProgress = totalEstimated > 0 ? Math.round((totalDone / totalEstimated) * 100) : 0;

  // Rough estimated finish: sum of remaining days per queued item (sequential execution)
  let totalDaysRemaining = 0;
  for (const p of inQueue) {
    const rem = Math.max(p.estimatedTotalHours - p.hoursCompleted, 0);
    if (p.dailyHoursAlloc > 0) totalDaysRemaining += Math.ceil(rem / p.dailyHoursAlloc);
  }
  const estimatedFinishDate = totalDaysRemaining > 0
    ? new Date(Date.now() + totalDaysRemaining * 86400000).toISOString()
    : null;

  return {
    activePriority: activePriority ? withComputedFields(activePriority) : null,
    nextPriority: nextPriority ? withComputedFields(nextPriority) : null,
    todayPlannedHours,
    totalRemainingHours,
    totalCompleted: completed.length,
    totalInQueue: inQueue.length,
    overallProgress,
    estimatedFinishDate,
  };
};
