import { Request, Response } from 'express';
import { habitService } from './habits.service';

export const habitController = {
  // POST /api/habits/log
  async logHabit(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const { habitType, date, count } = req.body;

      const habit = await habitService.logHabit(
        userId,
        habitType,
        date ? new Date(date as string) : new Date(),
        count || 1
      );

      res.json(habit);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  // GET /api/habits?startDate=&endDate=&type=
  async getHabits(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const { startDate, endDate, type } = req.query;

      const start = startDate ? new Date(startDate as string) : new Date();
      const end = endDate ? new Date(endDate as string) : new Date();

      const habits = await habitService.getHabitLogs(
        userId,
        start,
        end,
        type as any
      );

      res.json(habits);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  // GET /api/habits/heatmap/:habitType
  async getHeatmap(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const { habitType } = req.params;
      const months = parseInt(req.query.months as string) || 6;

      const data = await habitService.getHeatmapData(userId, habitType as any, months);
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  // GET /api/habits/daily/:date
  async getDailyHabits(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const { date } = req.params;

      const habits = await habitService.getDailyHabits(
        userId,
        date ? new Date(date as string) : new Date()
      );

      res.json(habits);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  // GET /api/habits/stats
  async getStats(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const stats = await habitService.getHabitStats(userId);
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  // GET /api/habits/consistency/:habitType
  async getConsistency(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const { habitType } = req.params;
      const days = parseInt(req.query.days as string) || 30;

      const score = await habitService.getConsistencyScore(
        userId,
        habitType as any,
        days
      );

      res.json({ habitType, days, consistencyScore: score });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
};
