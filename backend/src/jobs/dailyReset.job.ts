import prisma from '../config/database';
import { startOfDay } from 'date-fns';

/**
 * Daily Reset Job — runs at 4:00 AM
 * - Creates fresh DsaDailyGoal for today (does NOT reset past completed goals)
 * - Tasks are NOT rolled over — they stay on their original due date.
 */
export const runDailyResetJob = async () => {
  console.log('🔄 Running daily reset job...');

  const today = startOfDay(new Date());

  try {
    const users = await prisma.user.findMany({ select: { id: true } });

    for (const user of users) {
      try {
        // Create today's DSA daily goal entry if it doesn't exist
        // (ensures the goal tracker shows a fresh entry for today)
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
