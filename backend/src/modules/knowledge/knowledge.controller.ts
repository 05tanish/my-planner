import { Request, Response } from 'express';
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
      res.json(knowledge);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  // GET /api/knowledge/stats
  async getStats(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const stats = await knowledgeService.getStats(userId);
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  // GET /api/knowledge/search
  async search(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const query = req.query.q as string;
      
      if (!query) {
        return res.status(400).json({ error: 'Search query required' });
      }

      const results = await knowledgeService.search(userId, query as string);
      res.json(results);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  // GET /api/knowledge/:id
  async getOne(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;
      const knowledge = await knowledgeService.getOne(id as string, userId);
      
      if (!knowledge) {
        return res.status(404).json({ error: 'Knowledge not found' });
      }

      res.json(knowledge);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  // POST /api/knowledge/capture
  async captureFromUrl(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const { url } = req.body;

      if (!url) {
        return res.status(400).json({ error: 'URL required' });
      }

      let knowledge;

      // Process based on URL type
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        knowledge = await knowledgeService.processYouTubeVideo(userId, url as string);
      } else if (url.includes('github.com')) {
        knowledge = await knowledgeService.processGitHubRepo(userId, url as string);
      } else {
        knowledge = await knowledgeService.captureFromUrl(userId, url as string);
      }

      res.status(201).json(knowledge);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  // POST /api/knowledge/research
  async research(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const { query } = req.body;

      if (!query) {
        return res.status(400).json({ error: 'Research query required' });
      }

      const result = await knowledgeService.research(userId, query as string);
      res.status(201).json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  // POST /api/knowledge
  async create(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const knowledge = await knowledgeService.create(userId, req.body);
      res.status(201).json(knowledge);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  // PATCH /api/knowledge/:id
  async update(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;
      const knowledge = await knowledgeService.update(id as string, userId, req.body);
      res.json(knowledge);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  // DELETE /api/knowledge/:id
  async delete(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;
      await knowledgeService.delete(id as string, userId);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  // POST /api/knowledge/:id/link-dsa
  async linkToDsa(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;
      const { topics } = req.body;
      const knowledge = await knowledgeService.linkToDsaTopic(id as string, userId, topics);
      res.json(knowledge);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  // POST /api/knowledge/:id/link-projects
  async linkToProjects(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;
      const { projectIds } = req.body;
      const knowledge = await knowledgeService.linkToProjects(id as string, userId, projectIds);
      res.json(knowledge);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  // POST /api/knowledge/:id/link-questions
  async linkToQuestions(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;
      const { questionIds } = req.body;
      const knowledge = await knowledgeService.linkToQuestions(id as string, userId, questionIds);
      res.json(knowledge);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  // POST /api/knowledge/:id/save-to-notes
  async saveToNotes(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;
      const note = await knowledgeService.saveToNotes(id as string, userId);
      res.status(201).json(note);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
};
