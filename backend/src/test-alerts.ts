import { sendEmail } from './services/email.service';
import { sendTelegramMessage } from './services/telegram.service';
import prisma from './config/database';
import { runDailyReportJob } from './jobs/dailyReport.job';

async function testAlerts() {
  console.log('Testing alerts...');
  
  const user = await prisma.user.findFirst({
    where: { email: 'tanishjain626@gmail.com' },
    include: { profile: true }
  });

  if (!user) {
    console.error('User not found!');
    process.exit(1);
  }

  // 1. Test Email
  try {
    console.log(`Sending test email to ${user.email}...`);
    await sendEmail(
      user.email, 
      '🚀 DevOS System Verification', 
      '<h2>Verification Successful</h2><p>Your DevOS email integration is working perfectly!</p>'
    );
    console.log('✅ Email sent!');
  } catch (error) {
    console.error('❌ Email failed:', error);
  }

  // 2. Test Telegram
  if (user.profile?.telegramChatId) {
    try {
      console.log(`Sending Telegram message to ${user.profile.telegramChatId}...`);
      await sendTelegramMessage(
        user.profile.telegramChatId,
        '🚀 <b>DevOS System Verification</b>\n\nYour Telegram integration is working perfectly!'
      );
      console.log('✅ Telegram sent!');
    } catch (error) {
      console.error('❌ Telegram failed:', error);
    }
  } else {
    console.log('⚠️ No telegramChatId found for user. Telegram test skipped.');
  }

  // 3. Force trigger the Daily Report (so they can see the full UI report!)
  try {
     console.log('Force-triggering the daily productivity report directly...');
     await runDailyReportJob();
     console.log('✅ Daily report triggered successfully!');
  } catch (error) {
     console.log('⚠️ Could not run daily report directly (it might not be exported correctly):', error);
  }

  console.log('Done!');
  process.exit(0);
}

testAlerts();
