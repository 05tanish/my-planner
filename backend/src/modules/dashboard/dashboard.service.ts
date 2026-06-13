import prisma from '../../config/database';
import { AppError } from '../../middleware/error.middleware';
import { startOfDay, endOfDay } from 'date-fns';
import { getStreakStats } from '../github/github.service';
import * as redis from '../../services/redis.service';

const DEFAULT_WIDGETS = [
  { id: 'tasks', type: 'TODAY_TASKS', visible: true, config: {} },
  { id: 'dsa', type: 'DSA_PROGRESS', visible: true, config: {} },
  { id: 'github', type: 'GITHUB_STREAK', visible: true, config: {} },
  { id: 'learning', type: 'LEARNING_HOURS', visible: true, config: {} },
  { id: 'revision', type: 'REVISION_DUE', visible: true, config: {} },
  { id: 'reminders', type: 'REMINDERS', visible: true, config: {} },
  { id: 'placement', type: 'PLACEMENT_PROGRESS', visible: true, config: {} },
  { id: 'jobs', type: 'JOB_APPLICATIONS', visible: true, config: {} },
  { id: 'notes', type: 'NOTES_SUMMARY', visible: true, config: {} },
];

const DEFAULT_LAYOUT = [
  { i: 'tasks', x: 0, y: 0, w: 4, h: 4 },
  { i: 'dsa', x: 4, y: 0, w: 4, h: 4 },
  { i: 'github', x: 8, y: 0, w: 4, h: 4 },
  { i: 'learning', x: 0, y: 4, w: 6, h: 4 },
  { i: 'revision', x: 6, y: 4, w: 6, h: 4 },
  { i: 'reminders', x: 0, y: 8, w: 4, h: 4 },
  { i: 'placement', x: 4, y: 8, w: 4, h: 4 },
  { i: 'jobs', x: 8, y: 8, w: 4, h: 4 },
  { i: 'notes', x: 0, y: 12, w: 12, h: 4 },
];

export const getLayout = async (userId: string) => {
  let layout = await prisma.dashboardLayout.findFirst({
    where: { userId, isDefault: true },
  });

  if (!layout) {
    // Create default layout
    layout = await prisma.dashboardLayout.create({
      data: {
        userId,
        name: 'Default',
        isDefault: true,
        layout: DEFAULT_LAYOUT as any,
        widgets: DEFAULT_WIDGETS as any,
      },
    });
  } else {
    if (!layout.layout) {
      layout.layout = DEFAULT_LAYOUT as any;
    }
    if (!layout.widgets) {
      layout.widgets = DEFAULT_WIDGETS as any;
    }
  }

  return layout;
};

export const updateLayout = async (userId: string, data: any) => {
  const layout = await prisma.dashboardLayout.findFirst({
    where: { userId, isDefault: true },
  });

  if (!layout) {
    return prisma.dashboardLayout.create({
      data: {
        userId,
        name: 'Default',
        isDefault: true,
        layout: data.layout || DEFAULT_LAYOUT,
        widgets: data.widgets || DEFAULT_WIDGETS,
      },
    });
  }

  return prisma.dashboardLayout.update({
    where: { id: layout.id },
    data: {
      layout: data.layout !== undefined ? (data.layout === null ? DEFAULT_LAYOUT : data.layout) : undefined,
      widgets: data.widgets !== undefined ? (data.widgets === null ? DEFAULT_WIDGETS : data.widgets) : undefined,
    },
  });
};

export const getStats = async (userId: string) => {
  const cacheKey = `cache:dashboard:stats:${userId}`;
  try {
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
      return JSON.parse(cachedData);
    }
  } catch (error) {
    console.error('❌ Stats Cache read error:', error);
  }

  const today = new Date();
  const start = startOfDay(today);
  const end = endOfDay(today);

  const [
    tasksDueToday,
    tasksCompletedToday,
    totalPendingTasks,
    totalDsaSolved,
    dueRevisions,
    githubStats,
    learningAgg,
    jobs,
    readingBooks,
    pinnedNotesCount,
    totalNotesCount,
    activeRemindersCount,
  ] = await Promise.all([
    prisma.task.count({
      where: {
        userId,
        dueDate: { gte: start, lte: end },
      },
    }),
    prisma.task.count({
      where: {
        userId,
        status: 'DONE',
        updatedAt: { gte: start, lte: end },
      },
    }),
    prisma.task.count({
      where: {
        userId,
        status: { in: ['TODO', 'IN_PROGRESS'] },
      },
    }),
    prisma.dsaProblem.count({
      where: { userId },
    }),
    prisma.dsaRevision.count({
      where: {
        problem: { userId },
        dueDate: { lte: end },
        completedAt: null,
      },
    }),
    getStreakStats(userId),
    prisma.learningEntry.aggregate({
      where: {
        userId,
        createdAt: { gte: start, lte: end },
      },
      _sum: { durationMin: true },
    }),
    prisma.job.findMany({
      where: { userId },
      select: { status: true },
    }),
    prisma.book.findMany({
      where: { userId, readingStatus: 'READING' },
      select: { id: true, title: true, author: true, currentPage: true, totalPages: true },
    }),
    prisma.note.count({
      where: { userId, isPinned: true, isArchived: false },
    }),
    prisma.note.count({
      where: { userId, isArchived: false },
    }),
    prisma.reminder.count({
      where: { userId, isActive: true },
    }),
  ]);

  const learningMinutesToday = learningAgg._sum.durationMin || 0;

  const statsResult = {
    tasks: {
      dueToday: tasksDueToday,
      completedToday: tasksCompletedToday,
      pending: totalPendingTasks,
    },
    dsa: {
      totalSolved: totalDsaSolved,
      dueRevisions,
    },
    github: githubStats,
    learning: {
      minutesToday: learningMinutesToday,
    },
    jobs: jobs,
    books: {
      reading: readingBooks,
      count: readingBooks.length,
    },
    notes: {
      pinned: pinnedNotesCount,
      total: totalNotesCount,
    },
    reminders: {
      active: activeRemindersCount,
    },
  };

  try {
    await redis.set(cacheKey, JSON.stringify(statsResult), 30); // Cache for 30 seconds
  } catch (error) {
    console.error('❌ Stats Cache write error:', error);
  }

  return statsResult;
};
