import { runDailyReportJob } from './jobs/dailyReport.job';
import prisma from './config/database';

async function test() {
  const users = await prisma.user.findMany({ include: { profile: true }});
  console.log('Users in DB:');
  for (const u of users) {
    console.log(`- ${u.email}: notifEmail=${u.profile?.notifEmail}, notifTelegram=${u.profile?.notifTelegram}, tgChatId=${u.profile?.telegramChatId}`);
  }
  console.log('\nRunning report job now...');
  await runDailyReportJob();
  process.exit(0);
}
test();
