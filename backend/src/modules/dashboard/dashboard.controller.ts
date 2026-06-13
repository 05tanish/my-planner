import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import * as service from './dashboard.service';
import { sendSuccess } from '../../utils/response';

export const getLayout = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const layout = await service.getLayout(req.user!.userId);
    return sendSuccess(res, layout);
  } catch (e) {
    next(e);
  }
};

export const updateLayout = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const layout = await service.updateLayout(req.user!.userId, req.body);
    return sendSuccess(res, layout, 'Dashboard layout updated');
  } catch (e) {
    next(e);
  }
};

export const getStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const stats = await service.getStats(req.user!.userId);
    return sendSuccess(res, stats);
  } catch (e) {
    next(e);
  }
};
