import { Request, Response } from 'express';
import { hackathonService } from './hackathons.service';

export const hackathonController = {
  async getAll(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const status = req.query.status as any;
      const hackathons = await hackathonService.getAll(userId, status);
      res.json(hackathons);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  async getStats(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const stats = await hackathonService.getStats(userId);
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  async getUpcoming(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const hackathons = await hackathonService.getUpcoming(userId);
      res.json(hackathons);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  async getOne(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;
      const hackathon = await hackathonService.getOne(id as string, userId);
      if (!hackathon) {
        return res.status(404).json({ error: 'Hackathon not found' });
      }
      res.json(hackathon);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  async create(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const hackathon = await hackathonService.create(userId, req.body);
      res.status(201).json(hackathon);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  async update(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;
      const hackathon = await hackathonService.update(id as string, userId, req.body);
      res.json(hackathon);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  async delete(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;
      await hackathonService.delete(id as string, userId);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
};
