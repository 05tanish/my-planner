import cron from 'node-cron';
import prisma from '../config/database';
import { alertService } from '../modules/alerts/alerts.service';
import { sendTelegramMessage } from '../services/telegram.service';
import { startOfDay, startOfWeek, endOfWeek, format } from 'date-fns';

// Phase 15: Alert Scanner - Every hour
export const startAlertScanner = () => {
  cron.schedule('0 * * * *', async () => {
    console.log('🔔 Running alert scanner...');
    
    try {
      const users = await prisma.user.findMany({
        include: { profile: true }
      });

      for (const user of users) {
        await alertService.scanAndCreateAlerts(user.id);
        
        // Send Telegram notification for critical alerts
        if (user.profile?.telegramChatId && user.profile?.notifTelegram) {
          const criticalAlerts = await prisma.alert.findMany({
            where: {
              userId: user.id,
              dismissed: false,
              level: 'CRITICAL',
              notified: false
            }
          });

          if (criticalAlerts.length > 0) {
            const message = 
              `🚨 <b>Critical Alerts</b>\n\n` +
              criticalAlerts.map(a => `• ${a.title}: ${a.message}`).join('\n');
            
            await sendTelegramMessage(user.profile.telegramChatId, message);
            
            // Mark as notified
            await prisma.alert.updateMany({
              where: { id: { in: criticalAlerts.map(a => a.id) } },
              data: { notified: true }
            });
          }
        }
      }

      console.log('✅ Alert scanner completed');
    } catch (error) {
      console.error('❌ Alert scanner failed:', error);
    }
  });
};

// Phase 11: Daily AI Mentor - Every day at 11 PM
export const startDailyAIMentor = () => {
  cron.schedule('0 23 * * *', async () => {
    console.log('🤖 Running daily AI mentor...');
    
    try {
      const users = await prisma.user.findMany({
        include: { profile: true }
      });

      const today = startOfDay(new Date());

      for (const user of users) {
        // Gather today's data
        const [tasksCompleted, dsaToday, commits, applications] = await Promise.all([
          prisma.task.count({
            where: {
              userId: user.id,
              status: 'DONE',
              completedAt: { gte: today }
            }
          }),
          prisma.dsaDailyGoal.findUnique({
            where: { userId_date: { userId: user.id, date: today } }
          }),
          prisma.githubActivity.findFirst({
            where: { userId: user.id, date: today }
          }),
          prisma.job.count({
            where: { userId: user.id, createdAt: { gte: today } }
          })
        ]);

        // Create report
        const report = await prisma.dailyAIMentorReport.create({
          data: {
            userId: user.id,
            date: today,
            tasksCompleted,
            dsaSolved: dsaToday?.solvedCount || 0,
            codingHours: 0, // Can be enhanced with time tracking
            commits: commits?.commits || 0,
            applicationsSent: applications,
            achievements: generateAchievements(tasksCompleted, dsaToday, commits),
            weaknesses: generateWeaknesses(tasksCompleted, dsaToday, commits),
            missedGoals: generateMissedGoals(dsaToday, commits, applications),
            tomorrowFocus: generateTomorrowFocus(dsaToday, commits),
            priorityTasks: []
          }
        });

        // Send Telegram summary
        if (user.profile?.telegramChatId && user.profile?.notifTelegram) {
          const message = formatAIMentorMessage(user.profile.name, report);
          await sendTelegramMessage(user.profile.telegramChatId, message);
        }
      }

      console.log('✅ Daily AI mentor completed');
    } catch (error) {
      console.error('❌ Daily AI mentor failed:', error);
    }
  });
};

// Phase 12: Weekly Review - Every Sunday at 8 PM
export const startWeeklyReview = () => {
  cron.schedule('0 20 * * 0', async () => {
    console.log('📊 Running weekly review...');
    
    try {
      const users = await prisma.user.findMany({
        include: { profile: true }
      });

      const weekStart = startOfWeek(new Date());
      const weekEnd = endOfWeek(new Date());

      for (const user of users) {
        // Gather week's data
        const [tasks, dsa, projects, commits, jobs, learning] = await Promise.all([
          prisma.task.count({
            where: {
              userId: user.id,
              status: 'DONE',
              completedAt: { gte: weekStart, lte: weekEnd }
            }
          }),
          prisma.dsaProblem.count({
            where: {
              userId: user.id,
              solvedAt: { gte: weekStart, lte: weekEnd }
            }
          }),
          prisma.project.findMany({
            where: { userId: user.id, updatedAt: { gte: weekStart } }
          }),
          prisma.githubActivity.findMany({
            where: {
              userId: user.id,
              date: { gte: weekStart, lte: weekEnd }
            }
          }),
          prisma.job.count({
            where: {
              userId: user.id,
              createdAt: { gte: weekStart, lte: weekEnd }
            }
          }),
          Promise.resolve(0) // Learning Hub removed
        ]);

        const totalCommits = commits.reduce((sum, c) => sum + c.commits, 0);
        const projectsProgress = projects.reduce((acc, p) => {
          acc[p.id] = p.completionPercentage;
          return acc;
        }, {} as any);

        // Create review
        const review = await prisma.weeklyReview.create({
          data: {
            userId: user.id,
            weekStartDate: weekStart,
            weekEndDate: weekEnd,
            codingHours: 0, // Can be enhanced
            dsaCount: dsa,
            projectsProgress,
            applicationsSent: jobs,
            commits: totalCommits,
            learningHours: learning * 0.5, // Estimate
            biggestWin: generateBiggestWin(dsa, totalCommits, jobs),
            biggestBottleneck: generateBottleneck(dsa, totalCommits),
            improvementAreas: generateImprovementAreas(dsa, totalCommits, jobs),
            actionPlan: generateActionPlan(dsa, totalCommits, jobs)
          }
        });

        // Send Telegram summary
        if (user.profile?.telegramChatId && user.profile?.notifTelegram) {
          const message = formatWeeklyReviewMessage(user.profile.name, review);
          await sendTelegramMessage(user.profile.telegramChatId, message);
        }
      }

      console.log('✅ Weekly review completed');
    } catch (error) {
      console.error('❌ Weekly review failed:', error);
    }
  });
};

// Helper functions
function generateAchievements(tasks: number, dsa: any, commits: any): string[] {
  const achievements: string[] = [];
  if (tasks >= 5) achievements.push(`Completed ${tasks} tasks`);
  if (dsa?.completed) achievements.push('Met DSA daily goal');
  if (commits && commits.commits > 0) achievements.push(`Made ${commits.commits} commits`);
  return achievements;
}

function generateWeaknesses(tasks: number, dsa: any, commits: any): string[] {
  const weaknesses: string[] = [];
  if (tasks === 0) weaknesses.push('No tasks completed today');
  if (!dsa || !dsa.completed) weaknesses.push('DSA goal not met');
  if (!commits || commits.commits === 0) weaknesses.push('No GitHub activity');
  return weaknesses;
}

function generateMissedGoals(dsa: any, commits: any, apps: number): string[] {
  const missed: string[] = [];
  if (!dsa || !dsa.completed) missed.push('Daily DSA practice');
  if (!commits || commits.commits === 0) missed.push('GitHub contributions');
  if (apps === 0) missed.push('Job applications');
  return missed;
}

function generateTomorrowFocus(dsa: any, commits: any): string[] {
  const focus: string[] = [];
  if (!dsa || !dsa.completed) focus.push('Complete DSA daily goal');
  if (!commits || commits.commits === 0) focus.push('Make at least 1 commit');
  focus.push('Review high-priority tasks');
  return focus;
}

function generateBiggestWin(dsa: number, commits: number, jobs: number): string {
  if (commits > 20) return `Strong GitHub activity: ${commits} commits`;
  if (dsa >= 5) return `Solved ${dsa} DSA problems`;
  if (jobs > 5) return `Applied to ${jobs} companies`;
  return 'Stayed consistent with daily goals';
}

function generateBottleneck(dsa: number, commits: number): string {
  if (dsa < 3) return 'DSA practice needs more focus';
  if (commits < 5) return 'GitHub activity could be improved';
  return 'Maintain current momentum';
}

function generateImprovementAreas(dsa: number, commits: number, jobs: number): string[] {
  const areas: string[] = [];
  if (dsa < 5) areas.push('Increase DSA problem-solving frequency');
  if (commits < 10) areas.push('More consistent GitHub contributions');
  if (jobs < 3) areas.push('Ramp up job applications');
  return areas;
}

function generateActionPlan(dsa: number, commits: number, jobs: number): string[] {
  const plan: string[] = [];
  if (dsa < 5) plan.push('Solve 2 DSA problems daily');
  if (commits < 10) plan.push('Commit to projects daily');
  if (jobs < 3) plan.push('Apply to 5 companies this week');
  plan.push('Review interview questions daily');
  return plan;
}

function formatAIMentorMessage(name: string, report: any): string {
  return (
    `🤖 <b>Daily AI Mentor - ${name}</b>\n\n` +
    `📅 ${format(report.date, 'EEEE, MMM dd')}\n\n` +
    `<b>Today's Stats:</b>\n` +
    `✅ Tasks: ${report.tasksCompleted}\n` +
    `🧠 DSA: ${report.dsaSolved}\n` +
    `🐙 Commits: ${report.commits}\n` +
    `💼 Applications: ${report.applicationsSent}\n\n` +
    `<b>🎉 Achievements:</b>\n${report.achievements.map((a: string) => `• ${a}`).join('\n') || '• Keep pushing!'}\n\n` +
    `<b>⚠️ Areas to Improve:</b>\n${report.weaknesses.map((w: string) => `• ${w}`).join('\n') || '• Great job!'}\n\n` +
    `<b>🎯 Tomorrow's Focus:</b>\n${report.tomorrowFocus.map((f: string) => `• ${f}`).join('\n')}`
  );
}

function formatWeeklyReviewMessage(name: string, review: any): string {
  return (
    `📊 <b>Weekly Review - ${name}</b>\n\n` +
    `📅 Week of ${format(review.weekStartDate, 'MMM dd')}\n\n` +
    `<b>This Week:</b>\n` +
    `🧠 DSA Problems: ${review.dsaCount}\n` +
    `🐙 Commits: ${review.commits}\n` +
    `💼 Applications: ${review.applicationsSent}\n` +
    `📚 Learning: ${review.learningHours.toFixed(1)}h\n\n` +
    `<b>🏆 Biggest Win:</b>\n${review.biggestWin}\n\n` +
    `<b>🚧 Bottleneck:</b>\n${review.biggestBottleneck}\n\n` +
    `<b>📈 Improvement Areas:</b>\n${review.improvementAreas.map((a: string) => `• ${a}`).join('\n')}\n\n` +
    `<b>🎯 Next Week Action Plan:</b>\n${review.actionPlan.map((p: string) => `• ${p}`).join('\n')}`
  );
}

// Start all cron jobs
export const startV2Jobs = () => {
  console.log('🚀 Starting DevOS V2 cron jobs...');
  startAlertScanner();
  startDailyAIMentor();
  startWeeklyReview();
  console.log('✅ All V2 cron jobs started');
};
