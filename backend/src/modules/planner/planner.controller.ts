import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import * as service from './planner.service';
import { sendSuccess, sendCreated } from '../../utils/response';

export const create = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { return sendCreated(res, await service.createTask(req.user!.userId, req.body)); }
  catch (err) { next(err); }
};

export const list = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const query = { ...req.query, page: Number(req.query.page || 1), limit: Number(req.query.limit || 50) };
    return sendSuccess(res, await service.getTasks(req.user!.userId, query as any));
  } catch (err) { next(err); }
};

export const update = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { return sendSuccess(res, await service.updateTask(req.user!.userId, req.params.id as string, req.body), 'Task updated'); }
  catch (err) { next(err); }
};

export const remove = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { await service.deleteTask(req.user!.userId, req.params.id as string); return sendSuccess(res, null, 'Task deleted'); }
  catch (err) { next(err); }
};

export const todayTasks = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { return sendSuccess(res, await service.getTodayTasks(req.user!.userId)); }
  catch (err) { next(err); }
};
