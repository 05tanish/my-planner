import { PrismaClient, HabitType } from '@prisma/client';
import { startOfDay, endOfMonth, startOfMonth, subMonths, format } from 'date-fns';

const prisma = new PrismaClient();

export const habitService = {
  // Log habit for a date
  async logHabit(userId: string, habitType: HabitType, date: Date, count: number = 1) {
    const dateOnly = startOfDay(date);
    
    return prisma.habitLog.upsert({
      where: {
        userId_date_habitType: {
          userId,
          date: dateOnly,
          habitType
        }
      },
      create: {
        userId,
        date: dateOnly,
        habitType,
        completed: count > 0,
        count
      },
      update: {
        completed: count > 0,
        count
      }
    });
  },

  // Get habit logs for a date range
  async getHabitLogs(userId: string, startDate: Date, endDate: Date, habitType?: HabitType) {
    const where: any = {
      userId,
      date: {
        gte: startOfDay(startDate),
        lte: startOfDay(endDate)
      }
    };

    if (habitType) {
      where.habitType = habitType;
    }

    return prisma.habitLog.findMany({
      where,
      orderBy: { date: 'asc' }
    });
  },

  // Get heatmap data for a habit (last N months)
  async getHeatmapData(userId: string, habitType: HabitType, months: number = 6) {
    const endDate = new Date();
    const startDate = subMonths(startOfMonth(endDate), months - 1);

    const logs = await prisma.habitLog.findMany({
      where: {
        userId,
        habitType,
        date: {
          gte: startDate,
          lte: endOfMonth(endDate)
        }
      },
      orderBy: { date: 'asc' }
    });

    return logs.map(log => ({
      date: format(log.date, 'yyyy-MM-dd'),
      count: log.count,
      completed: log.completed
    }));
  },

  // Get all habits for a specific date
  async getDailyHabits(userId: string, date: Date) {
    const dateOnly = startOfDay(date);

    return prisma.habitLog.findMany({
      where: {
        userId,
        date: dateOnly
      }
    });
  },

  // Get consistency score for a habit (% of days completed in last N days)
  async getConsistencyScore(userId: string, habitType: HabitType, days: number = 30) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const logs = await prisma.habitLog.findMany({
      where: {
        userId,
        habitType,
        date: {
          gte: startOfDay(startDate),
          lte: startOfDay(endDate)
        }
      }
    });

    const completedDays = logs.filter(l => l.completed).length;
    return Math.round((completedDays / days) * 100);
  },

  // Get all habit stats
  async getHabitStats(userId: string) {
    const today = startOfDay(new Date());
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [todayLogs, monthLogs] = await Promise.all([
      prisma.habitLog.findMany({
        where: { userId, date: today }
      }),
      prisma.habitLog.findMany({
        where: {
          userId,
          date: {
            gte: thirtyDaysAgo,
            lte: today
          }
        }
      })
    ]);

    const habitTypes = Object.values(HabitType);
    const stats: any = {
      today: {},
      month: {},
      consistency: {}
    };

    for (const type of habitTypes) {
      const todayLog = todayLogs.find(l => l.habitType === type);
      const monthLogsForType = monthLogs.filter(l => l.habitType === type);
      const completedDays = monthLogsForType.filter(l => l.completed).length;

      stats.today[type] = {
        completed: todayLog?.completed || false,
        count: todayLog?.count || 0
      };

      stats.month[type] = {
        totalDays: monthLogsForType.length,
        completedDays,
        totalCount: monthLogsForType.reduce((sum, l) => sum + l.count, 0)
      };

      stats.consistency[type] = Math.round((completedDays / 30) * 100);
    }

    return stats;
  }
};
