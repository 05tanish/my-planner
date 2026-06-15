import { Request, Response } from 'express';
import { hackathonService } from './hackathons.service';

export const hackathonController = {
  async getAll(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const status = req.query.status as any;
      const hackathons = await hackathonService.getAll(userId, status);
      res.json(hackathons);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  async getStats(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const stats = await hackathonService.getStats(userId);
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  async getUpcoming(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const hackathons = await hackathonService.getUpcoming(userId);
      res.json(hackathons);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  async getOne(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      const hackathon = await hackathonService.getOne(id, userId);
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
      const userId = req.user!.id;
      const hackathon = await hackathonService.create(userId, req.body);
      res.status(201).json(hackathon);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  async update(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      const hackathon = await hackathonService.update(id, userId, req.body);
      res.json(hackathon);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  async delete(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      await hackathonService.delete(id, userId);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
};
