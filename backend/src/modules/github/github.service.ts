import prisma from '../../config/database';
import { AppError } from '../../middleware/error.middleware';
import { startOfDay, differenceInDays, format, subDays } from 'date-fns';

export const logActivity = async (userId: string, data: any) => {
  // Use provided date, parsed to start of day, or default to today's date
  const targetDate = startOfDay(data.date ? new Date(data.date) : new Date());

  // Upsert activity based on userId and date
  return prisma.githubActivity.upsert({
    where: {
      userId_date: {
        userId,
        date: targetDate,
      },
    },
    update: {
      commits: data.commits !== undefined ? data.commits : undefined,
      repositories: data.repositories,
      features: data.features,
      bugsFix: data.bugsFix,
      upcomingWork: data.upcomingWork,
      notes: data.notes,
    },
    create: {
      userId,
      date: targetDate,
      commits: data.commits !== undefined ? data.commits : 0,
      repositories: data.repositories || [],
      features: data.features,
      bugsFix: data.bugsFix,
      upcomingWork: data.upcomingWork,
      notes: data.notes,
    },
  });
};

export const listActivities = async (userId: string, startDate?: string, endDate?: string) => {
  const where: any = { userId };

  if (startDate || endDate) {
    where.date = {};
    if (startDate) where.date.gte = startOfDay(new Date(startDate));
    if (endDate) where.date.lte = startOfDay(new Date(endDate));
  }

  return prisma.githubActivity.findMany({
    where,
    orderBy: { date: 'desc' },
  });
};

export const getStreakStats = async (userId: string) => {
  // Get all activities with commits > 0, ordered by date ascending
  const activities = await prisma.githubActivity.findMany({
    where: {
      userId,
      commits: { gt: 0 },
    },
    orderBy: { date: 'asc' },
    select: { date: true, commits: true },
  });

  let currentStreak = 0;
  let longestStreak = 0;
  let totalCommits = 0;

  const today = startOfDay(new Date());
  const yesterday = subDays(today, 1);

  if (activities.length > 0) {
    let tempStreak = 1;
    longestStreak = 1;

    for (let i = 0; i < activities.length; i++) {
      totalCommits += activities[i].commits;

      if (i > 0) {
        const prevDate = startOfDay(activities[i - 1].date);
        const currDate = startOfDay(activities[i].date);
        const diff = differenceInDays(currDate, prevDate);

        if (diff === 1) {
          tempStreak++;
        } else if (diff > 1) {
          if (tempStreak > longestStreak) {
            longestStreak = tempStreak;
          }
          tempStreak = 1;
        }
      }
    }

    if (tempStreak > longestStreak) {
      longestStreak = tempStreak;
    }

    // Determine current streak
    const lastActivityDate = startOfDay(activities[activities.length - 1].date);
    const diffFromEnd = differenceInDays(today, lastActivityDate);

    if (diffFromEnd === 0 || diffFromEnd === 1) {
      // Current streak is active (last commit was today or yesterday)
      // We calculate current streak by counting backwards from the last activity that is connected
      let streakCount = 1;
      for (let i = activities.length - 1; i > 0; i--) {
        const currDate = startOfDay(activities[i].date);
        const prevDate = startOfDay(activities[i - 1].date);
        const diff = differenceInDays(currDate, prevDate);
        if (diff === 1) {
          streakCount++;
        } else {
          break;
        }
      }
      currentStreak = streakCount;
    } else {
      currentStreak = 0;
    }
  }

  // Check if committed today
  const todayActivity = await prisma.githubActivity.findFirst({
    where: {
      userId,
      date: today,
    },
  });

  return {
    currentStreak,
    longestStreak,
    totalCommits,
    todayCommits: todayActivity?.commits || 0,
    hasCommittedToday: (todayActivity?.commits || 0) > 0,
  };
};
