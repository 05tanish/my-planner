import prisma from '../config/database';

/**
 * Activity Log Service
 * Records and queries system activity for the admin logs dashboard.
 * Auto-purges logs older than 3 weeks.
 */

// ─── Types ───────────────────────────────────────────────────

export interface LogActivityParams {
  userId: string;
  action: string;        // e.g. "login", "job.create", "extension.connect"
  entity?: string;       // e.g. "auth", "job", "extension"
  entityId?: string;     // ID of the affected record
  metadata?: Record<string, any>; // Extra context
  level?: 'info' | 'warn' | 'error';
}

export interface LogQueryParams {
  userId?: string;
  action?: string;
  entity?: string;
  level?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

// ─── Write ───────────────────────────────────────────────────

/**
 * Fire-and-forget log writer. Safe to call from any controller
 * without awaiting — errors are swallowed to never block the request.
 */
export function logActivity(params: LogActivityParams): void {
  prisma.activityLog.create({
    data: {
      userId: params.userId,
      action: params.action,
      entity: params.entity,
      entityId: params.entityId,
      metadata: params.metadata ?? undefined,
      level: params.level ?? 'info',
    },
  }).catch((err) => {
    console.error('[ActivityLog] Failed to write log:', err.message);
  });
}

// ─── Read ────────────────────────────────────────────────────

export async function queryLogs(params: LogQueryParams) {
  const {
    userId, action, entity, level,
    startDate, endDate,
    page = 1, limit = 50,
  } = params;

  const where: any = {};
  if (userId) where.userId = userId;
  if (action) where.action = { contains: action, mode: 'insensitive' };
  if (entity) where.entity = entity;
  if (level) where.level = level;
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = startDate;
    if (endDate) where.createdAt.lte = endDate;
  }

  const [logs, total] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        user: {
          select: { id: true, email: true, profile: { select: { name: true } } },
        },
      },
    }),
    prisma.activityLog.count({ where }),
  ]);

  return {
    logs,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getLogStats() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [totalToday, totalWeek, errorCount, actionBreakdown, dailyActivity] = await Promise.all([
    // Total events today
    prisma.activityLog.count({
      where: { createdAt: { gte: todayStart } },
    }),
    // Total events this week
    prisma.activityLog.count({
      where: { createdAt: { gte: weekAgo } },
    }),
    // Errors this week
    prisma.activityLog.count({
      where: { level: 'error', createdAt: { gte: weekAgo } },
    }),
    // Action breakdown (top 10)
    prisma.activityLog.groupBy({
      by: ['action'],
      _count: { action: true },
      where: { createdAt: { gte: weekAgo } },
      orderBy: { _count: { action: 'desc' } },
      take: 10,
    }),
    // Daily activity for the past 7 days
    prisma.$queryRaw<Array<{ day: string; count: bigint }>>`
      SELECT DATE(\"createdAt\") as day, COUNT(*)::bigint as count
      FROM "ActivityLog"
      WHERE "createdAt" >= ${weekAgo}
      GROUP BY DATE("createdAt")
      ORDER BY day ASC
    `,
  ]);

  return {
    totalToday,
    totalWeek,
    errorCount,
    actionBreakdown: actionBreakdown.map((a) => ({
      action: a.action,
      count: a._count.action,
    })),
    dailyActivity: dailyActivity.map((d) => ({
      day: d.day,
      count: Number(d.count),
    })),
  };
}

// ─── Purge ───────────────────────────────────────────────────

const THREE_WEEKS_MS = 21 * 24 * 60 * 60 * 1000;

/**
 * Delete all activity logs older than 3 weeks.
 * Called by the background cron job.
 */
export async function purgeOldLogs(): Promise<number> {
  const cutoff = new Date(Date.now() - THREE_WEEKS_MS);
  const result = await prisma.activityLog.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });
  if (result.count > 0) {
    console.log(`[ActivityLog] Purged ${result.count} logs older than 3 weeks`);
  }
  return result.count;
}
