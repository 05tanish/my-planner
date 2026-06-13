import prisma from '../config/database';
import { sendTelegramMessage } from '../services/telegram.service';
import { startOfDay } from 'date-fns';

export const runGithubReminderJob = async () => {
  console.log('⏰ Starting GitHub Consistency Check Job...');
  try {
    const users = await prisma.user.findMany({
      include: {
        profile: true,
      },
    });

    const today = startOfDay(new Date());

    for (const user of users) {
      if (!user.profile?.notifTelegram || !user.profile.telegramChatId) {
        continue;
      }

      // Check if they have committed today
      const activity = await prisma.githubActivity.findFirst({
        where: {
          userId: user.id,
          date: today,
        },
      });

      const commits = activity?.commits || 0;

      if (commits === 0) {
        console.log(`⏰ Sending GitHub reminder to user ${user.email}`);
        const message = `⚠️ <b>GitHub Consistency Reminder</b>\n\nYou haven't pushed any commits today! Keep your green streak alive. Push some code before midnight! 🚀`;
        await sendTelegramMessage(user.profile.telegramChatId, message);
      } else {
        console.log(`⏰ User ${user.email} has already committed today (${commits} commits).`);
      }
    }
  } catch (error) {
    console.error('❌ Error in GitHub Reminder Job:', error);
  }
};
