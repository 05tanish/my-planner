import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '../../middleware/auth.middleware';
import { collegePlacementService } from './college-placement.service';

export const collegePlacementController = {
  // Create a new college placement application
  create: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const file = req.file;

      console.log('📝 Creating placement for user:', userId);
      console.log('📄 Request body:', req.body);
      console.log('📎 File:', file ? `${file.originalname} (${file.size} bytes)` : 'No file');

      // Parse JSON fields from FormData
      const body = { ...req.body };
      if (body.skills && typeof body.skills === 'string') {
        try {
          body.skills = JSON.parse(body.skills);
        } catch (e) {
          body.skills = [];
        }
      }
      if (body.rounds && typeof body.rounds === 'string') {
        try {
          body.rounds = JSON.parse(body.rounds);
        } catch (e) {
          body.rounds = [];
        }
      }

      const placement = await collegePlacementService.create(userId, body, file);
      console.log('✅ Placement created successfully:', placement.id);
      res.status(201).json({ success: true, data: placement });
    } catch (error: any) {
      console.error('❌ Error creating placement:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message || 'Failed to create placement',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  },

  // List all college placement applications
  list: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const placements = await collegePlacementService.list(userId, req.query);
      res.json({ success: true, data: placements });
    } catch (error) {
      next(error);
    }
  },

  // Get a single college placement application
  getOne: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const placement = await collegePlacementService.getOne(userId, id);

      if (!placement) {
        return res.status(404).json({ success: false, message: 'College placement not found' });
      }

      res.json({ success: true, data: placement });
    } catch (error) {
      next(error);
    }
  },

  // Update a college placement application
  update: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const file = req.file;

      // Parse JSON fields from FormData
      const body = { ...req.body };
      if (body.skills && typeof body.skills === 'string') {
        try {
          body.skills = JSON.parse(body.skills);
        } catch (e) {
          body.skills = [];
        }
      }
      if (body.rounds && typeof body.rounds === 'string') {
        try {
          body.rounds = JSON.parse(body.rounds);
        } catch (e) {
          body.rounds = [];
        }
      }

      const placement = await collegePlacementService.update(userId, id, body, file);
      res.json({ success: true, data: placement });
    } catch (error) {
      next(error);
    }
  },

  // Delete a college placement application
  remove: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      
      await collegePlacementService.remove(userId, id);
      res.json({ success: true, message: 'College placement deleted successfully' });
    } catch (error) {
      next(error);
    }
  },

  // Delete only the resume file
  deleteResume: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      
      const placement = await collegePlacementService.deleteResume(userId, id);
      res.json({ success: true, data: placement, message: 'Resume deleted successfully' });
    } catch (error) {
      next(error);
    }
  },

  // Get statistics
  getStats: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const stats = await collegePlacementService.getStats(userId);
      res.json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  },
};
