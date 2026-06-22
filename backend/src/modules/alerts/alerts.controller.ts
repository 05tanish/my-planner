import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../../utils/response';
import { alertService } from './alerts.service';

export const alertController = {
  async getAll(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const dismissed = req.query.dismissed === 'true';
      const alerts = await alertService.getAll(userId, dismissed);
      return sendSuccess(res, alerts);
    } catch (error: any) {
      return sendError(res, error.message, 500);
    }
  },

  async getStats(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const stats = await alertService.getStats(userId);
      return sendSuccess(res, stats);
    } catch (error: any) {
      return sendError(res, error.message, 500);
    }
  },

  async dismiss(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const id = req.params.id as string;
      const alert = await alertService.dismiss(id, userId);
      return sendSuccess(res, alert);
    } catch (error: any) {
      return sendError(res, error.message, 500);
    }
  },

  async dismissAll(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      await alertService.dismissAll(userId);
      return sendSuccess(res, null, 'All alerts dismissed');
    } catch (error: any) {
      return sendError(res, error.message, 500);
    }
  },

  async scan(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const count = await alertService.scanAndCreateAlerts(userId);
      return sendSuccess(res, { count });
    } catch (error: any) {
      return sendError(res, error.message, 500);
    }
  }
};
