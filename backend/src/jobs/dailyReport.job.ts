import cron from 'node-cron';
import prisma from '../config/database';
import { generateDailySnapshot } from '../modules/analytics/analytics.service';
import { sendEmail } from '../services/email.service';
import { sendTelegramMessage } from '../services/telegram.service';
import { startOfDay, subDays } from 'date-fns';

export const runDailyReportJob = async (targetUserId?: string) => {
  console.log('📧 Running daily productivity report job...');
  
  try {
    const users = await prisma.user.findMany({
      where: targetUserId ? { id: targetUserId } : undefined,
      include: { profile: true }
    });

    const now = new Date();
    // If running at 4:00 AM reset (or early morning < 4 AM) or automated run, report on the completed day (yesterday).
    // If triggered manually during daytime (>= 4 AM), report on current active day.
    const isEarlyMorning = now.getHours() < 4;
    const reportDate = isEarlyMorning || !targetUserId ? subDays(startOfDay(now), 1) : startOfDay(now);

    for (const user of users) {
      if (!user.profile?.notifEmail && !user.profile?.notifTelegram) continue;

      // Generate and fetch snapshot for the target reporting day
      const snapshot = await generateDailySnapshot(user.id, reportDate);
      
      // Fetch remaining active priorities
      const activePriorities = await prisma.priority.findMany({
        where: { userId: user.id, isActive: true },
        take: 3,
        orderBy: { queuePosition: 'asc' }
      });

      if (user.profile.notifEmail) {
        const html = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; color: #1a1a1a; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">DevOS Daily Brief</h1>
              <p style="color: #e0e7ff; margin: 10px 0 0 0; font-size: 15px; opacity: 0.9;">Your productivity snapshot for today</p>
            </div>

            <div style="padding: 30px;">
              <p style="font-size: 16px; line-height: 1.5; color: #374151; margin-top: 0;">
                Hey <strong>${user.profile?.name || 'Developer'}</strong>,<br/>
                Here's how your day looked from a data perspective. Great work staying consistent.
              </p>
              
              <!-- Quick Stats Grid -->
              <div style="margin: 30px 0;">
                <h2 style="font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #6b7280; margin-bottom: 15px; font-weight: 600;">📊 Today's Metrics</h2>
                
                <div style="background-color: #f9fafb; border-radius: 10px; border: 1px solid #f3f4f6; padding: 20px;">
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; width: 30px;"><span style="font-size: 18px;">✅</span></td>
                      <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #4b5563; font-size: 15px;">Tasks Completed</td>
                      <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 700; font-size: 16px;">${snapshot.tasksCompleted}</td>
                    </tr>
                    <tr>
                      <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;"><span style="font-size: 18px;">💻</span></td>
                      <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #4b5563; font-size: 15px;">DSA Solved</td>
                      <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 700; font-size: 16px;">${snapshot.dsaSolved}</td>
                    </tr>
                    <tr>
                      <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;"><span style="font-size: 18px;">🟩</span></td>
                      <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #4b5563; font-size: 15px;">GitHub Commits</td>
                      <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 700; font-size: 16px;">${snapshot.githubCommits}</td>
                    </tr>
                    <tr>
                      <td style="padding: 10px 0;"><span style="font-size: 18px;">🚀</span></td>
                      <td style="padding: 10px 0; color: #4b5563; font-size: 15px;">Jobs Applied</td>
                      <td style="padding: 10px 0; text-align: right; font-weight: 700; font-size: 16px;">${snapshot.jobsApplied}</td>
                    </tr>
                  </table>
                </div>
              </div>

              <!-- Priority Queue -->
              <div style="margin: 30px 0;">
                <h2 style="font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #6b7280; margin-bottom: 15px; font-weight: 600;">🎯 Active Priorities</h2>
                
                ${activePriorities.length > 0 ? `
                  <div style="display: flex; flex-direction: column; gap: 12px;">
                    ${activePriorities.map(p => `
                      <div style="border-left: 4px solid #4f46e5; background-color: #f9fafb; padding: 16px; border-radius: 0 8px 8px 0; border-top: 1px solid #f3f4f6; border-right: 1px solid #f3f4f6; border-bottom: 1px solid #f3f4f6;">
                        <h3 style="margin: 0 0 8px 0; font-size: 16px; color: #111827;">${p.title}</h3>
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                          <div style="font-size: 13px; color: #6b7280;">Est. time left: <strong style="color: #4b5563;">${Math.max(p.estimatedTotalHours - p.hoursCompleted, 0)}h</strong></div>
                          <div style="font-size: 13px; font-weight: 700; color: #4f46e5;">${p.progress}%</div>
                        </div>
                        <div style="margin-top: 8px; background-color: #e5e7eb; border-radius: 99px; height: 6px; width: 100%; overflow: hidden;">
                          <div style="background-color: #4f46e5; height: 100%; width: ${p.progress}%; border-radius: 99px;"></div>
                        </div>
                      </div>
                    `).join('')}
                  </div>
                ` : '<div style="background-color: #f9fafb; padding: 16px; border-radius: 8px; text-align: center; color: #6b7280; font-size: 14px;">No active priorities in queue. Enjoy the rest! ☕</div>'}
              </div>
              
            </div>
            
            <!-- Footer -->
            <div style="background-color: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                Generated by <strong>DevOS</strong> • Your automated productivity system<br/>
                To stop receiving these, adjust settings in your profile.
              </p>
            </div>
          </div>
        `;

        await sendEmail(user.email, '📊 Your Daily Productivity Report', html);
      }

      if (user.profile.notifTelegram && user.profile.telegramChatId) {
        let telegramMsg = `📊 <b>DevOS Daily Brief</b>\n\n`;
        telegramMsg += `✅ Tasks Completed: <b>${snapshot.tasksCompleted}</b>\n`;
        telegramMsg += `💻 DSA Solved: <b>${snapshot.dsaSolved}</b>\n`;
        telegramMsg += `🟩 GitHub Commits: <b>${snapshot.githubCommits}</b>\n`;
        telegramMsg += `🚀 Jobs Applied: <b>${snapshot.jobsApplied}</b>\n\n`;

        if (activePriorities.length > 0) {
          telegramMsg += `🎯 <b>Active Priorities</b>\n`;
          activePriorities.forEach(p => {
            telegramMsg += `• ${p.title} (${p.progress}%)\n`;
          });
        }
        await sendTelegramMessage(user.profile.telegramChatId, telegramMsg);
      }
    }

    console.log('✅ Daily report job completed');
  } catch (error) {
    console.error('❌ Daily report job failed:', error);
  }
};

export const startDailyReportJob = () => {
  // Runs every day at 4:00 AM (morning reset time)
  cron.schedule('0 4 * * *', () => runDailyReportJob());
};
