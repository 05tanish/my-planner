import prisma from '../../config/database';
import { AppError } from '../../middleware/error.middleware';
import { startOfDay, endOfDay, subDays } from 'date-fns';

export const logProductivity = async (userId: string, data: any) => {
  const targetDate = startOfDay(data.date ? new Date(data.date) : new Date());

  return prisma.productivityLog.upsert({
    where: {
      userId_date: {
        userId,
        date: targetDate,
      },
    },
    update: {
      studyMinutes: data.studyMinutes !== undefined ? data.studyMinutes : undefined,
      codingMinutes: data.codingMinutes !== undefined ? data.codingMinutes : undefined,
      projectMinutes: data.projectMinutes !== undefined ? data.projectMinutes : undefined,
      readingMinutes: data.readingMinutes !== undefined ? data.readingMinutes : undefined,
      notes: data.notes,
    },
    create: {
      userId,
      date: targetDate,
      studyMinutes: data.studyMinutes !== undefined ? data.studyMinutes : 0,
      codingMinutes: data.codingMinutes !== undefined ? data.codingMinutes : 0,
      projectMinutes: data.projectMinutes !== undefined ? data.projectMinutes : 0,
      readingMinutes: data.readingMinutes !== undefined ? data.readingMinutes : 0,
      notes: data.notes,
    },
  });
};

export const getProductivityLogs = async (userId: string, startDate?: string, endDate?: string) => {
  const where: any = { userId };

  if (startDate || endDate) {
    where.date = {};
    if (startDate) where.date.gte = startOfDay(new Date(startDate));
    if (endDate) where.date.lte = startOfDay(new Date(endDate));
  }

  return prisma.productivityLog.findMany({
    where,
    orderBy: { date: 'asc' },
  });
};

export const getAnalyticsSnapshots = async (userId: string, startDate?: string, endDate?: string) => {
  const where: any = { userId };

  if (startDate || endDate) {
    where.date = {};
    if (startDate) where.date.gte = startOfDay(new Date(startDate));
    if (endDate) where.date.lte = startOfDay(new Date(endDate));
  }

  return prisma.analyticsSnapshot.findMany({
    where,
    orderBy: { date: 'asc' },
  });
};

// Generate snapshot for a specific date (typically yesterday, or today)
export const generateDailySnapshot = async (userId: string, date: Date) => {
  const targetDate = startOfDay(date);
  const start = startOfDay(date);
  const end = endOfDay(date);

  // 1. DSA problems solved today
  const dsaSolved = await prisma.dsaProblem.count({
    where: {
      userId,
      solvedAt: { gte: start, lte: end },
    },
  });

  // 2. DSA revisions completed today
  const revisionsCount = await prisma.dsaRevision.count({
    where: {
      problem: { userId },
      completedAt: { gte: start, lte: end },
    },
  });

  // 3. Learning minutes today (Removed Learning Hub)
  const learningMinutes = 0;

  // 4. Github commits today
  const githubActivity = await prisma.githubActivity.findUnique({
    where: {
      userId_date: {
        userId,
        date: targetDate,
      },
    },
  });
  const githubCommits = githubActivity?.commits || 0;

  // 5. Tasks completed today
  const tasksCompleted = await prisma.task.count({
    where: {
      userId,
      status: 'DONE',
      updatedAt: { gte: start, lte: end },
    },
  });

  // 6. Jobs applied today
  const jobsApplied = await prisma.job.count({
    where: {
      userId,
      status: 'APPLIED',
      appliedDate: { gte: start, lte: end },
    },
  });

  // Upsert the snapshot
  return prisma.analyticsSnapshot.upsert({
    where: {
      userId_date: {
        userId,
        date: targetDate,
      },
    },
    update: {
      dsaSolved,
      revisionsCount,
      learningMinutes,
      githubCommits,
      tasksCompleted,
      jobsApplied,
    },
    create: {
      userId,
      date: targetDate,
      dsaSolved,
      revisionsCount,
      learningMinutes,
      githubCommits,
      tasksCompleted,
      jobsApplied,
    },
  });
};
