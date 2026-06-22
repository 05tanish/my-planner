import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../../utils/response';
import { interviewService } from './interviews.service';

export const interviewController = {
  // GET /api/interviews
  async getAll(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const filters = {
        category: req.query.category as any,
        subCategory: req.query.subCategory as any,
        difficulty: req.query.difficulty as any,
        tags: req.query.tags ? String(req.query.tags).split(',') : undefined,
        favorite: req.query.favorite === 'true'
      };
      const questions = await interviewService.getQuestions(userId, filters);
      return sendSuccess(res, questions);
    } catch (error: any) {
      return sendError(res, error.message, 500);
    }
  },

  // GET /api/interviews/stats
  async getStats(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const stats = await interviewService.getStats(userId);
      return sendSuccess(res, stats);
    } catch (error: any) {
      return sendError(res, error.message, 500);
    }
  },

  // GET /api/interviews/due
  async getDueForRevision(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const questions = await interviewService.getDueForRevision(userId);
      return sendSuccess(res, questions);
    } catch (error: any) {
      return sendError(res, error.message, 500);
    }
  },

  // GET /api/interviews/search
  async search(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const query = req.query.q as string;
      if (!query) {
        return sendError(res, 'Search query required', 400);
      }
      const questions = await interviewService.searchQuestions(userId, query);
      return sendSuccess(res, questions);
    } catch (error: any) {
      return sendError(res, error.message, 500);
    }
  },

  // GET /api/interviews/:id
  async getOne(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const id = req.params.id as string;
      const question = await interviewService.getQuestion(id, userId);
      if (!question) {
        return sendError(res, 'Question not found', 404);
      }
      return sendSuccess(res, question);
    } catch (error: any) {
      return sendError(res, error.message, 500);
    }
  },

  // POST /api/interviews
  async create(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const question = await interviewService.createQuestion(userId, req.body);
      return sendSuccess(res, question, 'Question created', 201);
    } catch (error: any) {
      return sendError(res, error.message, 500);
    }
  },

  // PATCH /api/interviews/:id
  async update(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const id = req.params.id as string;
      const question = await interviewService.updateQuestion(id, userId, req.body);
      return sendSuccess(res, question);
    } catch (error: any) {
      return sendError(res, error.message, 500);
    }
  },

  // DELETE /api/interviews/:id
  async delete(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const id = req.params.id as string;
      await interviewService.deleteQuestion(id, userId);
      return sendSuccess(res, null, 'Question deleted');
    } catch (error: any) {
      return sendError(res, error.message, 500);
    }
  },

  // POST /api/interviews/:id/revise
  async markRevised(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const id = req.params.id as string;
      const question = await interviewService.markRevised(id, userId);
      return sendSuccess(res, question);
    } catch (error: any) {
      return sendError(res, error.message, 500);
    }
  },

  // POST /api/interviews/:id/favorite
  async toggleFavorite(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const id = req.params.id as string;
      const question = await interviewService.toggleFavorite(id, userId);
      return sendSuccess(res, question);
    } catch (error: any) {
      return sendError(res, error.message, 500);
    }
  }
};
