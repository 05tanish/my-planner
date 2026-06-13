import prisma from '../config/database';
import { generateDailySnapshot } from '../modules/analytics/analytics.service';
import { subDays } from 'date-fns';

export const runAnalyticsSnapshotJob = async () => {
  console.log('⏰ Starting Analytics Daily Snapshot Job...');
  try {
    const users = await prisma.user.findMany();
    // Snapshot is computed for yesterday
    const yesterday = subDays(new Date(), 1);

    for (const user of users) {
      console.log(`⏰ Generating daily snapshot for user ${user.email} for date ${yesterday.toDateString()}`);
      await generateDailySnapshot(user.id, yesterday);
    }
    console.log('⏰ Analytics Snapshot Job completed successfully.');
  } catch (error) {
    console.error('❌ Error in Analytics Snapshot Job:', error);
  }
};
