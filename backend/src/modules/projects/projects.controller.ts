import { Request, Response } from 'express';
import { projectService } from './projects.service';
import { sendSuccess, sendError } from '../../utils/response';

export const projectController = {
  // GET /api/projects
  async getAll(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const status = req.query.status as any;

      const projects = await projectService.getUserProjects(userId, status);
      return sendSuccess(res, projects);
    } catch (error: any) {
      return sendError(res, error.message, 500);
    }
  },

  // GET /api/projects/stats
  async getStats(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const stats = await projectService.getProjectStats(userId);
      return sendSuccess(res, stats);
    } catch (error: any) {
      return sendError(res, error.message, 500);
    }
  },

  // GET /api/projects/:id
  async getOne(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      const project = await projectService.getProject(id as string, userId);
      if (!project) {
        return sendError(res, 'Project not found', 404);
      }

      return sendSuccess(res, project);
    } catch (error: any) {
      return sendError(res, error.message, 500);
    }
  },

  // POST /api/projects
  async create(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const project = await projectService.createProject(userId, req.body);
      return sendSuccess(res, project, 'Project created', 201);
    } catch (error: any) {
      return sendError(res, error.message, 500);
    }
  },

  // PATCH /api/projects/:id
  async update(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      const project = await projectService.updateProject(id as string, userId, req.body);
      return sendSuccess(res, project);
    } catch (error: any) {
      return sendError(res, error.message, 500);
    }
  },

  // DELETE /api/projects/:id
  async delete(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      await projectService.deleteProject(id as string, userId);
      return sendSuccess(res, null, 'Project deleted');
    } catch (error: any) {
      return sendError(res, error.message, 500);
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
      
      return sendSuccess(res, feature, 'Feature added', 201);
    } catch (error: any) {
      return sendError(res, error.message, 500);
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
      
      return sendSuccess(res, feature);
    } catch (error: any) {
      return sendError(res, error.message, 500);
    }
  },

  // DELETE /api/projects/features/:featureId
  async deleteFeature(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const { featureId } = req.params;

      await projectService.deleteFeature(featureId as string, userId);
      return sendSuccess(res, null, 'Feature deleted');
    } catch (error: any) {
      return sendError(res, error.message, 500);
    }
  },

  // PATCH /api/projects/:id/progress
  async updateProgress(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      const project = await projectService.updateProjectProgress(id as string, userId);
      return sendSuccess(res, project);
    } catch (error: any) {
      return sendError(res, error.message, 500);
    }
  }
};
