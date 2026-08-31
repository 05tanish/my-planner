import { Router } from 'express';
import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { queryLogs, getLogStats, purgeOldLogs } from '../../services/activity-log.service';
import { sendSuccess, sendError } from '../../utils/response';

const router = Router();

// All logs routes require admin role
router.use(authenticate);
router.use(authorize(['ADMIN']));

/**
 * GET /api/logs
 * Query activity logs with optional filters.
 */
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const {
      action, entity, level, userId,
      startDate, endDate,
      page = '1', limit = '50',
    } = req.query as Record<string, string>;

    const result = await queryLogs({
      action: action || undefined,
      entity: entity || undefined,
      level: level || undefined,
      userId: userId || undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      page: parseInt(page, 10) || 1,
      limit: Math.min(parseInt(limit, 10) || 50, 100),
    });

    return sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/logs/stats
 * Aggregated log statistics for dashboard visualization.
 */
router.get('/stats', async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const stats = await getLogStats();
    return sendSuccess(res, stats);
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/logs/purge
 * Manually trigger purge of logs older than 3 weeks.
 */
router.delete('/purge', async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const count = await purgeOldLogs();
    return sendSuccess(res, { purged: count }, `Purged ${count} old log entries`);
  } catch (err) {
    next(err);
  }
});

export default router;
