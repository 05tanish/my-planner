import { PrismaClient, AlertType, AlertLevel } from '@prisma/client';
import { startOfDay, endOfDay } from 'date-fns';

const prisma = new PrismaClient();

export const alertService = {
  async getAll(userId: string, dismissed: boolean = false) {
    return prisma.alert.findMany({
      where: { userId, dismissed },
      orderBy: [
        { level: 'desc' },
        { createdAt: 'desc' }
      ]
    });
  },

  async create(userId: string, data: {
    type: AlertType;
    level: AlertLevel;
    title: string;
    message: string;
    actionUrl?: string;
  }) {
    return prisma.alert.create({
      data: { ...data, userId }
    });
  },

  async dismiss(id: string, userId: string) {
    return prisma.alert.update({
      where: { id, userId },
      data: { dismissed: true }
    });
  },

  async dismissAll(userId: string) {
    return prisma.alert.updateMany({
      where: { userId, dismissed: false },
      data: { dismissed: true }
    });
  },

  async scanAndCreateAlerts(userId: string) {
    const today = new Date();
    const todayStart = startOfDay(today);
    const todayEnd = endOfDay(today);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const alerts: any[] = [];

    // Check overdue tasks
    const overdueTasks = await prisma.task.count({
      where: {
        userId,
        status: { in: ['TODO', 'IN_PROGRESS'] },
        dueDate: { lt: todayStart }
      }
    });

    if (overdueTasks > 0) {
      alerts.push({
        type: 'OVERDUE_TASK',
        level: 'HIGH',
        title: 'Overdue Tasks',
        message: `You have ${overdueTasks} overdue task${overdueTasks > 1 ? 's' : ''}`,
        actionUrl: '/planner'
      });
    }

    // Check high priority tasks
    const highPriorityTasks = await prisma.task.count({
      where: {
        userId,
        status: { in: ['TODO', 'IN_PROGRESS'] },
        priority: { in: ['URGENT', 'CRITICAL'] }
      }
    });

    if (highPriorityTasks > 0) {
      alerts.push({
        type: 'HIGH_PRIORITY_TASK',
        level: 'HIGH',
        title: 'High Priority Tasks',
        message: `${highPriorityTasks} urgent task${highPriorityTasks > 1 ? 's' : ''} need${highPriorityTasks === 1 ? 's' : ''} attention`,
        actionUrl: '/planner'
      });
    }

    // Check 24h deadlines
    const upcomingDeadlines = await prisma.task.count({
      where: {
        userId,
        status: { in: ['TODO', 'IN_PROGRESS'] },
        dueDate: { gte: todayEnd, lte: tomorrow }
      }
    });

    if (upcomingDeadlines > 0) {
      alerts.push({
        type: 'DEADLINE_24H',
        level: 'NORMAL',
        title: 'Upcoming Deadlines',
        message: `${upcomingDeadlines} task${upcomingDeadlines > 1 ? 's' : ''} due in 24 hours`,
        actionUrl: '/planner'
      });
    }

    // Check DSA goal
    const dsaGoal = await prisma.dsaDailyGoal.findUnique({
      where: { userId_date: { userId, date: todayStart } }
    });

    if (!dsaGoal || !dsaGoal.completed) {
      alerts.push({
        type: 'MISSED_DSA_GOAL',
        level: 'NORMAL',
        title: 'DSA Goal Incomplete',
        message: 'Complete your daily DSA goal',
        actionUrl: '/dsa'
      });
    }

    // Check GitHub commits
    const githubActivity = await prisma.githubActivity.findFirst({
      where: { userId, date: todayStart }
    });

    if (!githubActivity || githubActivity.commits === 0) {
      alerts.push({
        type: 'NO_COMMITS_TODAY',
        level: 'NORMAL',
        title: 'No Commits Today',
        message: 'Keep your GitHub streak alive',
        actionUrl: '/github'
      });
    }

    // Create alerts that don't already exist
    for (const alertData of alerts) {
      const existing = await prisma.alert.findFirst({
        where: {
          userId,
          type: alertData.type,
          dismissed: false,
          createdAt: { gte: todayStart }
        }
      });

      if (!existing) {
        await this.create(userId, alertData);
      }
    }

    return alerts.length;
  },

  async getStats(userId: string) {
    const [total, byLevel, critical] = await Promise.all([
      prisma.alert.count({ where: { userId, dismissed: false } }),
      prisma.alert.groupBy({
        by: ['level'],
        where: { userId, dismissed: false },
        _count: true
      }),
      prisma.alert.count({
        where: { userId, dismissed: false, level: 'CRITICAL' }
      })
    ]);

    return { total, byLevel, critical };
  }
};
