import prisma from '../config/database';
import { subDays } from 'date-fns';

/**
 * Database Cleanup Job — runs daily at 3:00 AM
 * - Removes tasks that are DONE/CANCELLED and older than 4 days
 * - Removes expired Session records
 */
export const runDatabaseCleanupJob = async () => {
  console.log('🧹 Running database cleanup job...');

  try {
    const fourDaysAgo = subDays(new Date(), 4);

    // 1. Delete tasks older than 4 days that are DONE or CANCELLED
    const deletedTasks = await prisma.task.deleteMany({
      where: {
        status: { in: ['DONE', 'CANCELLED'] },
        updatedAt: { lt: fourDaysAgo },
      },
    });

    if (deletedTasks.count > 0) {
      console.log(`  🗑️ Deleted ${deletedTasks.count} old completed/cancelled tasks.`);
    }

    // 2. Delete expired sessions
    const deletedSessions = await prisma.session.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });

    if (deletedSessions.count > 0) {
      console.log(`  🗑️ Deleted ${deletedSessions.count} expired sessions.`);
    }

    console.log('✅ Database cleanup job completed');
  } catch (error) {
    console.error('❌ Database cleanup job failed:', error);
  }
};
