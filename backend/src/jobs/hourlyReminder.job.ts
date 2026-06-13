import prisma from '../config/database';
import { sendTelegramMessage } from '../services/telegram.service';
import { startOfDay, endOfDay, differenceInHours } from 'date-fns';

export const runHourlyReminderJob = async () => {
  console.log('⏰ Starting Hourly Status Digest Check Job...');
  try {
    const users = await prisma.user.findMany({
      include: {
        profile: true,
      },
    });

    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());

    for (const user of users) {
      if (!user.profile?.notifTelegram || !user.profile.telegramChatId) {
        continue;
      }

      const now = new Date();
      const interval = user.profile.telegramNotifInterval ?? 1;

      if (user.profile.lastTelegramSent) {
        const hoursPassed = differenceInHours(now, new Date(user.profile.lastTelegramSent));
        if (hoursPassed < interval) {
          console.log(`⏰ Skipping telegram digest for ${user.email} - only ${hoursPassed}/${interval} hours passed`);
          continue;
        }
      }

      // 1. Fetch uncompleted tasks for today/overdue
      const pendingTasks = await prisma.task.findMany({
        where: {
          userId: user.id,
          status: { in: ['TODO', 'IN_PROGRESS'] },
          OR: [
            { dueDate: null },
            { dueDate: { lte: todayEnd } }
          ]
        },
        take: 5, // List up to 5 tasks to keep message concise
        orderBy: { priority: 'desc' }
      });

      const totalPendingTasksCount = await prisma.task.count({
        where: {
          userId: user.id,
          status: { in: ['TODO', 'IN_PROGRESS'] },
          OR: [
            { dueDate: null },
            { dueDate: { lte: todayEnd } }
          ]
        }
      });

      // 2. Fetch GitHub commits count today
      const activity = await prisma.githubActivity.findFirst({
        where: {
          userId: user.id,
          date: todayStart,
        },
      });
      const commitsToday = activity?.commits || 0;

      // 3. Fetch due DSA revisions today
      const dueRevisions = await prisma.dsaRevision.findMany({
        where: {
          problem: { userId: user.id },
          dueDate: { lte: todayEnd },
          completedAt: null,
        },
        include: { problem: true },
        take: 5
      });

      const totalDueRevisionsCount = await prisma.dsaRevision.count({
        where: {
          problem: { userId: user.id },
          dueDate: { lte: todayEnd },
          completedAt: null,
        }
      });

      // 4. Fetch Placement Prep counts
      const placementNotesCount = await prisma.placementNote.count({
        where: { userId: user.id }
      });

      // 5. Construct Digest Message
      let message = `🔔 <b>DevOS Hourly Status Digest</b>\n\n`;

      // Tasks Section
      message += `📝 <b>Tasks Pending (${totalPendingTasksCount}):</b>\n`;
      if (pendingTasks.length === 0) {
        message += `• All tasks completed! 🎉\n`;
      } else {
        pendingTasks.forEach((t: any) => {
          message += `• [${t.priority}] ${t.title}\n`;
        });
        if (totalPendingTasksCount > 5) {
          message += `• <i>and ${totalPendingTasksCount - 5} more...</i>\n`;
        }
      }
      message += `\n`;

      // GitHub Section
      message += `💻 <b>GitHub Streak:</b>\n`;
      if (commitsToday > 0) {
        message += `• ✅ Active (${commitsToday} commits today)\n\n`;
      } else {
        message += `• ❌ Pending (No commits pushed today)\n\n`;
      }

      // DSA Section
      message += `📚 <b>DSA Revisions Due (${totalDueRevisionsCount}):</b>\n`;
      if (dueRevisions.length === 0) {
        message += `• All caught up! 👍\n`;
      } else {
        dueRevisions.forEach((rev: any) => {
          message += `• ${rev.problem.name} (${rev.problem.platform})\n`;
        });
        if (totalDueRevisionsCount > 5) {
          message += `• <i>and ${totalDueRevisionsCount - 5} more...</i>\n`;
        }
      }
      message += `\n`;

      // Placement Section
      message += `🎯 <b>Placement Prep:</b>\n`;
      message += `• ${placementNotesCount} active preparation notes/guides stored.\n\n`;

      message += `<i>Reply with /tasks or /help to interact!</i>`;

      console.log(`⏰ Sending hourly digest to ${user.email}`);
      await sendTelegramMessage(user.profile.telegramChatId, message);

      await prisma.profile.update({
        where: { id: user.profile.id },
        data: { lastTelegramSent: now },
      });
    }
  } catch (error) {
    console.error('❌ Error in Hourly Reminder Job:', error);
  }
};
