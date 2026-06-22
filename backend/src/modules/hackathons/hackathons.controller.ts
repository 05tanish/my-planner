import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../../utils/response';
import { hackathonService } from './hackathons.service';

export const hackathonController = {
  async getAll(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const status = req.query.status as any;
      const hackathons = await hackathonService.getAll(userId, status);
      return sendSuccess(res, hackathons);
    } catch (error: any) {
      return sendError(res, error.message, 500);
    }
  },

  async getStats(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const stats = await hackathonService.getStats(userId);
      return sendSuccess(res, stats);
    } catch (error: any) {
      return sendError(res, error.message, 500);
    }
  },

  async getUpcoming(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const hackathons = await hackathonService.getUpcoming(userId);
      return sendSuccess(res, hackathons);
    } catch (error: any) {
      return sendError(res, error.message, 500);
    }
  },

  async getOne(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const id = req.params.id as string;
      const hackathon = await hackathonService.getOne(id as string, userId);
      if (!hackathon) {
        return sendError(res, 'Hackathon not found', 404);
      }
      return sendSuccess(res, hackathon);
    } catch (error: any) {
      return sendError(res, error.message, 500);
    }
  },

  async create(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const hackathon = await hackathonService.create(userId, req.body);
      return sendSuccess(res, hackathon, 'Hackathon created', 201);
    } catch (error: any) {
      return sendError(res, error.message, 500);
    }
  },

  async update(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const id = req.params.id as string;
      const hackathon = await hackathonService.update(id as string, userId, req.body);
      return sendSuccess(res, hackathon);
    } catch (error: any) {
      return sendError(res, error.message, 500);
    }
  },

  async delete(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const id = req.params.id as string;
      await hackathonService.delete(id as string, userId);
      return sendSuccess(res, null, 'Hackathon deleted');
    } catch (error: any) {
      return sendError(res, error.message, 500);
    }
  }
};
