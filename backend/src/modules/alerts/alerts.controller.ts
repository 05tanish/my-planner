import { Request, Response } from 'express';
import { alertService } from './alerts.service';

export const alertController = {
  async getAll(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const dismissed = req.query.dismissed === 'true';
      const alerts = await alertService.getAll(userId, dismissed);
      res.json(alerts);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  async getStats(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const stats = await alertService.getStats(userId);
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  async dismiss(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;
      const alert = await alertService.dismiss(id as string, userId);
      res.json(alert);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  async dismissAll(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      await alertService.dismissAll(userId);
      res.json({ message: 'All alerts dismissed' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  async scan(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const count = await alertService.scanAndCreateAlerts(userId);
      res.json({ alertsCreated: count });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
};
