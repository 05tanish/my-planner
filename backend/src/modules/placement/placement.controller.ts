import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '../../middleware/auth.middleware';
import { placementService } from './placement.service';

export const placementController = {
  // Create a new placement note
  create: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const fileUrl = req.file?.path;

      const note = await placementService.create(userId, req.body, fileUrl);
      res.status(201).json({ success: true, data: note });
    } catch (error) {
      next(error);
    }
  },

  // List all placement notes
  list: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const notes = await placementService.list(userId, req.query);
      res.json({ success: true, data: notes });
    } catch (error) {
      next(error);
    }
  },

  // Get topics summary
  getTopics: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const topics = await placementService.getTopics(userId);
      res.json({ success: true, data: topics });
    } catch (error) {
      next(error);
    }
  },

  // Get a single placement note
  getOne: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const note = await placementService.getOne(userId, id);

      if (!note) {
        return res.status(404).json({ success: false, message: 'Placement note not found' });
      }

      res.json({ success: true, data: note });
    } catch (error) {
      next(error);
    }
  },

  // Get report (section-wise summary)
  getReport: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const section = req.query.section as string | undefined;
      const report = await placementService.getReport(userId, section);
      res.json({ success: true, data: report });
    } catch (error) {
      next(error);
    }
  },

  // Get report for a single note
  getOneReport: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const report = await placementService.getOneReport(userId, id);

      if (!report) {
        return res.status(404).json({ success: false, message: 'Placement note not found' });
      }

      res.json({ success: true, data: report });
    } catch (error) {
      next(error);
    }
  },

  // Update a placement note
  update: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const fileUrl = req.file?.path;

      const note = await placementService.update(userId, id, req.body, fileUrl);
      res.json({ success: true, data: note });
    } catch (error) {
      next(error);
    }
  },

  // Delete a placement note
  remove: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      await placementService.remove(userId, id);
      res.json({ success: true, message: 'Placement note deleted' });
    } catch (error) {
      next(error);
    }
  },
};
