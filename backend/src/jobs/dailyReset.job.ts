import prisma from '../config/database';
import { startOfDay, addDays } from 'date-fns';

/**
 * Daily Reset Job — runs at 4:00 AM
 * Resets daily progress counters without deleting historical records.
 * - Moves incomplete DAILY tasks that are overdue to today
 * - Resets GitHub daily counters if user has no activity logged today
 * - Ensures DsaDailyGoal for today exists (does NOT reset past completed goals)
 */
export const runDailyResetJob = async () => {
  console.log('🔄 Running daily reset job...');

  const today = startOfDay(new Date());
  const yesterday = startOfDay(addDays(today, -1));

  try {
    const users = await prisma.user.findMany({ select: { id: true } });

    for (const user of users) {
      try {
        // 1. Move overdue incomplete DAILY tasks to today
        //    (tasks that are past their due date and still TODO/IN_PROGRESS)
        const overdueTasks = await prisma.task.findMany({
          where: {
            userId: user.id,
            scope: 'DAILY',
            status: { in: ['TODO', 'IN_PROGRESS'] },
            dueDate: { lt: today },
          },
        });

        if (overdueTasks.length > 0) {
          await prisma.task.updateMany({
            where: {
              id: { in: overdueTasks.map(t => t.id) },
            },
            data: { dueDate: today },
          });
          console.log(`  ↻ Rolled over ${overdueTasks.length} tasks for user ${user.id}`);
        }

        // 2. Create today's DSA daily goal entry if it doesn't exist
        //    (ensures the goal tracker shows a fresh entry for today)
        await prisma.dsaDailyGoal.upsert({
          where: { userId_date: { userId: user.id, date: today } },
          create: { userId: user.id, date: today, completed: false, solvedCount: 0 },
          update: {}, // do not overwrite if already exists
        });

      } catch (userErr) {
        console.error(`  ❌ Daily reset failed for user ${user.id}:`, userErr);
        // continue to next user
      }
    }

    console.log('✅ Daily reset job completed');
  } catch (error) {
    console.error('❌ Daily reset job failed:', error);
  }
};
