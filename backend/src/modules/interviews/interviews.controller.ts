import { Request, Response } from 'express';
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
      res.json(questions);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  // GET /api/interviews/stats
  async getStats(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const stats = await interviewService.getStats(userId);
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  // GET /api/interviews/due
  async getDueForRevision(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const questions = await interviewService.getDueForRevision(userId);
      res.json(questions);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  // GET /api/interviews/search
  async search(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const query = req.query.q as string;

      if (!query) {
        return res.status(400).json({ error: 'Search query required' });
      }

      const questions = await interviewService.searchQuestions(userId, query as string);
      res.json(questions);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  // GET /api/interviews/:id
  async getOne(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      const question = await interviewService.getQuestion(id as string, userId);
      if (!question) {
        return res.status(404).json({ error: 'Question not found' });
      }

      res.json(question);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  // POST /api/interviews
  async create(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const question = await interviewService.createQuestion(userId, req.body);
      res.status(201).json(question);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  // PATCH /api/interviews/:id
  async update(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      const question = await interviewService.updateQuestion(id as string, userId, req.body);
      res.json(question);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  // DELETE /api/interviews/:id
  async delete(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      await interviewService.deleteQuestion(id as string, userId);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  // POST /api/interviews/:id/revise
  async markRevised(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      const question = await interviewService.markRevised(id as string, userId);
      res.json(question);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  // POST /api/interviews/:id/favorite
  async toggleFavorite(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      const question = await interviewService.toggleFavorite(id as string, userId);
      res.json(question);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
};
