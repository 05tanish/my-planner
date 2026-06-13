import cron from 'node-cron';
import { runDsaRevisionJob } from './dsaRevision.job';
import { runGithubReminderJob } from './githubReminder.job';
import { runAnalyticsSnapshotJob } from './analyticsSnapshot.job';
import { runHourlyReminderJob } from './hourlyReminder.job';

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

  console.log('⏰ Background jobs scheduled successfully.');
};
