import prisma from '../config/database';
import { sendDsaRevisionReminderEmail } from '../services/email.service';
import { sendTelegramMessage } from '../services/telegram.service';
import { endOfDay } from 'date-fns';

export const runDsaRevisionJob = async () => {
  console.log('⏰ Starting DSA Revision Check Job...');
  try {
    const users = await prisma.user.findMany({
      include: {
        profile: true,
      },
    });

    const todayEnd = endOfDay(new Date());

    for (const user of users) {
      // Find all due uncompleted revisions for this user
      const dueRevisions = await prisma.dsaRevision.findMany({
        where: {
          problem: {
            userId: user.id,
          },
          dueDate: {
            lte: todayEnd,
          },
          completedAt: null,
        },
        include: {
          problem: true,
        },
      });

      if (dueRevisions.length === 0) continue;

      const problemNames = dueRevisions.map((rev: any) => rev.problem.name);
      const problemsListText = problemNames.map((name: string) => `- ${name}`).join('\n');
      const problemsListHtml = `<ul>${problemNames.map((name: string) => `<li>${name}</li>`).join('')}</ul>`;

      console.log(`⏰ Found ${dueRevisions.length} due DSA revisions for user ${user.email}`);

      // Send Email
      if (user.profile?.notifEmail) {
        const emailHtml = `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #2a2d36; background-color: #0f1115; color: #f5f5f5; border-radius: 8px;">
            <h2 style="color: #4f8cff;">DSA Revisions Due Today</h2>
            <p>You have <strong>${dueRevisions.length}</strong> DSA problem(s) scheduled for revision today:</p>
            ${problemsListHtml}
            <p>Keep up the consistency! Head to your dashboard to mark them as completed.</p>
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/dsa" style="display: inline-block; background-color: #4f8cff; color: #ffffff; padding: 10px 20px; border-radius: 4px; text-decoration: none; margin: 20px 0;">Start Revising</a>
          </div>
        `;
        await sendDsaRevisionReminderEmail(user.email, `${dueRevisions.length} Problems`, new Date()); // Custom implementation wrapper
      }

      // Send Telegram
      if (user.profile?.notifTelegram && user.profile.telegramChatId) {
        const tgMessage = `📚 <b>DSA Revisions Due Today</b>\n\nYou have <b>${dueRevisions.length}</b> problem(s) to revise:\n\n${problemsListText}\n\nKeep your streak going! 💪`;
        await sendTelegramMessage(user.profile.telegramChatId, tgMessage);
      }
    }
  } catch (error) {
    console.error('❌ Error in DSA Revision Job:', error);
  }
};
