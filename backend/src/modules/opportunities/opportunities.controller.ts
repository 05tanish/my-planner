import { Request, Response } from 'express';
import { opportunityService } from './opportunities.service';

export const opportunityController = {
  async getAll(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const filters = {
        category: req.query.category as any,
        status: req.query.status as any
      };
      const opportunities = await opportunityService.getAll(userId, filters);
      res.json(opportunities);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  async getStats(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const stats = await opportunityService.getStats(userId);
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  async getUpcoming(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const days = parseInt(req.query.days as string) || 30;
      const opportunities = await opportunityService.getUpcoming(userId, days);
      res.json(opportunities);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  async getOne(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      const opportunity = await opportunityService.getOne(id, userId);
      if (!opportunity) {
        return res.status(404).json({ error: 'Opportunity not found' });
      }
      res.json(opportunity);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  async create(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const opportunity = await opportunityService.create(userId, req.body);
      res.status(201).json(opportunity);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  async update(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      const opportunity = await opportunityService.update(id, userId, req.body);
      res.json(opportunity);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  async delete(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      await opportunityService.delete(id, userId);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
};
