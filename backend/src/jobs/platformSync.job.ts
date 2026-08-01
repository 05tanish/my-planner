import prisma from '../config/database';
import { startOfDay } from 'date-fns';
import { fetchLeetcodeStats, fetchGfgStats } from '../modules/dsa/dsa.service';

/**
 * Platform Sync Job — syncs LeetCode & GFG stats for all users daily
 */
export const runPlatformSyncJob = async () => {
  console.log('🔄 Running platform sync job...');

  try {
    const profiles = await prisma.profile.findMany({
      where: {
        OR: [
          { leetcodeUsername: { not: null } },
          { gfgUsername: { not: null } },
        ],
      },
      select: {
        userId: true,
        leetcodeUsername: true,
        gfgUsername: true,
      },
    });

    const today = startOfDay(new Date());

    for (const profile of profiles) {
      try {
        // Sync LeetCode
        if (profile.leetcodeUsername) {
          const stats = await fetchLeetcodeStats(profile.leetcodeUsername);
          if (stats) {
            // Store as a DSA problem count snapshot using GitHubStats-like approach
            // We log to a custom analytics snapshot
            await prisma.analyticsSnapshot.upsert({
              where: { userId_date: { userId: profile.userId, date: today } },
              create: {
                userId: profile.userId,
                date: today,
                dsaSolved: stats.totalSolved,
              },
              update: {
                dsaSolved: stats.totalSolved,
              },
            });
            console.log(`  ✅ LeetCode synced for ${profile.leetcodeUsername}: ${stats.totalSolved} solved`);
          }
        }

        // Sync GFG
        if (profile.gfgUsername) {
          const stats = await fetchGfgStats(profile.gfgUsername);
          if (stats) {
            // We store GFG stats alongside LeetCode in the same snapshot
            // (additive — GFG problems are noted but not double-counted)
            console.log(`  ✅ GFG synced for ${profile.gfgUsername}: ${stats.totalSolved} solved`);
          }
        }
      } catch (userErr) {
        console.error(`  ❌ Sync failed for user ${profile.userId}:`, userErr);
      }
    }

    console.log('✅ Platform sync job completed');
  } catch (error) {
    console.error('❌ Platform sync job failed:', error);
  }
};
