import cron from 'node-cron';
import { runDsaRevisionJob } from './dsaRevision.job';
import { runGithubReminderJob } from './githubReminder.job';
import { runAnalyticsSnapshotJob } from './analyticsSnapshot.job';
import { runHourlyReminderJob } from './hourlyReminder.job';
import { startV2Jobs } from './v2Jobs';
import { runDailyResetJob } from './dailyReset.job';
import { runPlatformSyncJob } from './platformSync.job';

export const initScheduler = () => {
  console.log('⏰ Initializing background job scheduler...');

  // 1. DSA Revision Check - Daily at 8:00 AM
  cron.schedule('0 8 * * *', async () => {
    console.log('⏰ Triggered Scheduled Task: DSA Revision Check');
    await runDsaRevisionJob();
  });

  // 2. GitHub Push Reminder - Daily at 9:00 PM
  cron.schedule('0 21 * * *', async () => {
    console.log('⏰ Triggered Scheduled Task: GitHub Consistency Reminder');
    await runGithubReminderJob();
  });

  // 3. Analytics Snapshot - Daily at 12:05 AM (computes snapshot for yesterday)
  cron.schedule('5 0 * * *', async () => {
    console.log('⏰ Triggered Scheduled Task: Analytics Daily Snapshot');
    await runAnalyticsSnapshotJob();
  });

  // 4. Hourly Status Digest - Run every hour
  cron.schedule('0 * * * *', async () => {
    console.log('⏰ Triggered Scheduled Task: Hourly Status Digest');
    await runHourlyReminderJob();
  });

  // 5. Daily Reset - Every day at 4:00 AM
  //    - Rolls over incomplete DAILY tasks to today
  //    - Creates fresh DsaDailyGoal for today
  cron.schedule('0 4 * * *', async () => {
    console.log('⏰ Triggered Scheduled Task: Daily Reset');
    await runDailyResetJob();
  });

  // 6. Platform Sync (LeetCode, GFG) - Daily at 6:00 AM
  cron.schedule('0 6 * * *', async () => {
    console.log('⏰ Triggered Scheduled Task: Platform Sync (LeetCode/GFG)');
    await runPlatformSyncJob();
  });

  // V2 Jobs - Alert scanner, AI mentor, weekly review
  startV2Jobs();

  console.log('⏰ Background jobs scheduled successfully.');
};
