import { Request, Response } from 'express';
import { projectService } from './projects.service';

export const projectController = {
  // GET /api/projects
  async getAll(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const status = req.query.status as any;

      const projects = await projectService.getUserProjects(userId, status);
      res.json(projects);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  // GET /api/projects/stats
  async getStats(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const stats = await projectService.getProjectStats(userId);
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  // GET /api/projects/:id
  async getOne(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      const project = await projectService.getProject(id as string, userId);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      res.json(project);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  // POST /api/projects
  async create(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const project = await projectService.createProject(userId, req.body);
      res.status(201).json(project);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  // PATCH /api/projects/:id
  async update(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      const project = await projectService.updateProject(id as string, userId, req.body);
      res.json(project);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  // DELETE /api/projects/:id
  async delete(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      await projectService.deleteProject(id as string, userId);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  // POST /api/projects/:id/features
  async addFeature(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      const feature = await projectService.addFeature(id as string, userId, req.body);
      
      // Update project progress
      await projectService.updateProjectProgress(id as string, userId);
      
      res.status(201).json(feature);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  // PATCH /api/projects/features/:featureId
  async updateFeature(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const { featureId } = req.params;

      const feature = await projectService.updateFeature(featureId as string, userId, req.body);
      
      // Update project progress if status changed
      if (req.body.status) {
        const projectId = feature.projectId;
        await projectService.updateProjectProgress(projectId, userId);
      }
      
      res.json(feature);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  // DELETE /api/projects/features/:featureId
  async deleteFeature(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const { featureId } = req.params;

      await projectService.deleteFeature(featureId as string, userId);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  // PATCH /api/projects/:id/progress
  async updateProgress(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      const project = await projectService.updateProjectProgress(id as string, userId);
      res.json(project);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
};
