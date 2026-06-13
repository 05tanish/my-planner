import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import * as service from './analytics.service';
import { sendSuccess } from '../../utils/response';

export const logProductivity = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const log = await service.logProductivity(req.user!.userId, req.body);
    return sendSuccess(res, log, 'Productivity logged successfully');
  } catch (e) {
    next(e);
  }
};

export const getProductivityLogs = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate } = req.query;
    const logs = await service.getProductivityLogs(
      req.user!.userId,
      startDate as string,
      endDate as string
    );
    return sendSuccess(res, logs);
  } catch (e) {
    next(e);
  }
};

export const getAnalyticsSnapshots = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate } = req.query;
    const snapshots = await service.getAnalyticsSnapshots(
      req.user!.userId,
      startDate as string,
      endDate as string
    );
    return sendSuccess(res, snapshots);
  } catch (e) {
    next(e);
  }
};

export const triggerDailySnapshot = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const dateParam = req.body.date ? new Date(req.body.date) : new Date();
    const snapshot = await service.generateDailySnapshot(req.user!.userId, dateParam);
    return sendSuccess(res, snapshot, 'Daily snapshot triggered and generated');
  } catch (e) {
    next(e);
  }
};
