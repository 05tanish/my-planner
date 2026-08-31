import prisma from '../config/database';
import { subDays } from 'date-fns';
import { purgeOldLogs } from '../services/activity-log.service';

/**
 * Database Cleanup Job — runs daily at 3:00 AM
 * - Removes tasks that are DONE/CANCELLED and older than 4 days
 * - Removes expired Session records
 * - Purges activity logs older than 3 weeks
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

    // 3. Purge activity logs older than 3 weeks
    const purgedLogs = await purgeOldLogs();
    if (purgedLogs > 0) {
      console.log(`  🗑️ Purged ${purgedLogs} activity logs older than 3 weeks.`);
    }

    console.log('✅ Database cleanup job completed');
  } catch (error) {
    console.error('❌ Database cleanup job failed:', error);
  }
};
