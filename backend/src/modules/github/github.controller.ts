import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import * as service from './github.service';
import { sendSuccess } from '../../utils/response';

export const logActivity = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const activity = await service.logActivity(req.user!.userId, req.body);
    return sendSuccess(res, activity, 'GitHub activity logged successfully');
  } catch (e) {
    next(e);
  }
};

export const listActivities = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate } = req.query;
    const activities = await service.listActivities(
      req.user!.userId,
      startDate as string,
      endDate as string
    );
    return sendSuccess(res, activities);
  } catch (e) {
    next(e);
  }
};

export const getStreakStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const stats = await service.getStreakStats(req.user!.userId);
    return sendSuccess(res, stats);
  } catch (e) {
    next(e);
  }
};

export const syncFromGitHub = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await service.syncFromGitHubAPI(req.user!.userId);
    return sendSuccess(res, result, `Synced ${result.synced} days of activity from GitHub for @${result.username}`);
  } catch (e) {
    next(e);
  }
};

