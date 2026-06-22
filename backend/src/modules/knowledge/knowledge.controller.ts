import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../../utils/response';
import { knowledgeService } from './knowledge.service';

export const knowledgeController = {
  // GET /api/knowledge
  async getAll(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const filters = {
        sourceType: req.query.sourceType as any,
        tags: req.query.tags ? String(req.query.tags).split(',') : undefined
      };
      const knowledge = await knowledgeService.getAll(userId, filters);
      return sendSuccess(res, knowledge);
    } catch (error: any) {
      return sendError(res, error.message, 500);
    }
  },

  // GET /api/knowledge/stats
  async getStats(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const stats = await knowledgeService.getStats(userId);
      return sendSuccess(res, stats);
    } catch (error: any) {
      return sendError(res, error.message, 500);
    }
  },

  // GET /api/knowledge/search
  async search(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const query = req.query.q as string;
      if (!query) {
        return sendError(res, 'Search query required', 400);
      }
      const results = await knowledgeService.search(userId, query);
      return sendSuccess(res, results);
    } catch (error: any) {
      return sendError(res, error.message, 500);
    }
  },

  // GET /api/knowledge/:id
  async getOne(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const id = req.params.id as string;
      const knowledge = await knowledgeService.getOne(id, userId);
      if (!knowledge) {
        return sendError(res, 'Knowledge item not found', 404);
      }
      return sendSuccess(res, knowledge);
    } catch (error: any) {
      return sendError(res, error.message, 500);
    }
  },

  // POST /api/knowledge/capture
  async captureFromUrl(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const { url } = req.body;
      if (!url) {
        return sendError(res, 'URL is required', 400);
      }
      let knowledge;
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        knowledge = await knowledgeService.processYouTubeVideo(userId, url);
      } else if (url.includes('github.com')) {
        knowledge = await knowledgeService.processGitHubRepo(userId, url);
      } else {
        knowledge = await knowledgeService.captureFromUrl(userId, url);
      }
      return sendSuccess(res, knowledge, 'Knowledge captured', 201);
    } catch (error: any) {
      return sendError(res, error.message, 500);
    }
  },

  // POST /api/knowledge/research
  async research(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const { query } = req.body;
      if (!query) {
        return sendError(res, 'Query is required', 400);
      }
      const result = await knowledgeService.research(userId, query);
      return sendSuccess(res, result, 'Research complete', 201);
    } catch (error: any) {
      return sendError(res, error.message, 500);
    }
  },

  // POST /api/knowledge
  async create(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const knowledge = await knowledgeService.create(userId, req.body);
      return sendSuccess(res, knowledge, 'Knowledge item created', 201);
    } catch (error: any) {
      return sendError(res, error.message, 500);
    }
  },

  // PATCH /api/knowledge/:id
  async update(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const id = req.params.id as string;
      const knowledge = await knowledgeService.update(id, userId, req.body);
      return sendSuccess(res, knowledge);
    } catch (error: any) {
      return sendError(res, error.message, 500);
    }
  },

  // DELETE /api/knowledge/:id
  async delete(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const id = req.params.id as string;
      await knowledgeService.delete(id, userId);
      return sendSuccess(res, null, 'Knowledge item deleted');
    } catch (error: any) {
      return sendError(res, error.message, 500);
    }
  },

  // POST /api/knowledge/:id/link-dsa
  async linkToDsa(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const id = req.params.id as string;
      const { topics } = req.body;
      const knowledge = await knowledgeService.linkToDsaTopic(id, userId, topics);
      return sendSuccess(res, knowledge);
    } catch (error: any) {
      return sendError(res, error.message, 500);
    }
  },

  // POST /api/knowledge/:id/link-projects
  async linkToProjects(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const id = req.params.id as string;
      const { projectIds } = req.body;
      const knowledge = await knowledgeService.linkToProjects(id, userId, projectIds);
      return sendSuccess(res, knowledge);
    } catch (error: any) {
      return sendError(res, error.message, 500);
    }
  },

  // POST /api/knowledge/:id/link-questions
  async linkToQuestions(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const id = req.params.id as string;
      const { questionIds } = req.body;
      const knowledge = await knowledgeService.linkToQuestions(id, userId, questionIds);
      return sendSuccess(res, knowledge);
    } catch (error: any) {
      return sendError(res, error.message, 500);
    }
  },

  // POST /api/knowledge/:id/save-to-notes
  async saveToNotes(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const id = req.params.id as string;
      const note = await knowledgeService.saveToNotes(id, userId);
      return sendSuccess(res, note, 'Saved to notes', 201);
    } catch (error: any) {
      return sendError(res, error.message, 500);
    }
  }
};
