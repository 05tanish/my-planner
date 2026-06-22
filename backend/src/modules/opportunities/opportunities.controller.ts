import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../../utils/response';
import { opportunityService } from './opportunities.service';

export const opportunityController = {
  async getAll(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const filters = {
        category: req.query.category as any,
        status: req.query.status as any
      };
      const opportunities = await opportunityService.getAll(userId, filters);
      return sendSuccess(res, opportunities);
    } catch (error: any) {
      return sendError(res, error.message, 500);
    }
  },

  async getStats(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const stats = await opportunityService.getStats(userId);
      return sendSuccess(res, stats);
    } catch (error: any) {
      return sendError(res, error.message, 500);
    }
  },

  async getUpcoming(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const days = parseInt(req.query.days as string) || 30;
      const opportunities = await opportunityService.getUpcoming(userId, days);
      return sendSuccess(res, opportunities);
    } catch (error: any) {
      return sendError(res, error.message, 500);
    }
  },

  async getOne(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const id = req.params.id as string;
      const opportunity = await opportunityService.getOne(id, userId);
      if (!opportunity) {
        return sendError(res, 'Opportunity not found', 404);
      }
      return sendSuccess(res, opportunity);
    } catch (error: any) {
      return sendError(res, error.message, 500);
    }
  },

  async create(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const opportunity = await opportunityService.create(userId, req.body);
      return sendSuccess(res, opportunity, 'Opportunity created', 201);
    } catch (error: any) {
      return sendError(res, error.message, 500);
    }
  },

  async update(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const id = req.params.id as string;
      const opportunity = await opportunityService.update(id, userId, req.body);
      return sendSuccess(res, opportunity);
    } catch (error: any) {
      return sendError(res, error.message, 500);
    }
  },

  async delete(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const id = req.params.id as string;
      await opportunityService.delete(id, userId);
      return sendSuccess(res, null, 'Opportunity deleted');
    } catch (error: any) {
      return sendError(res, error.message, 500);
    }
  }
};
