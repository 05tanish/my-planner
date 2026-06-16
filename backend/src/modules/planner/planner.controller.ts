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

// PATCH /planner/:id/next-day — move task due date to tomorrow
export const moveToNextDay = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { return sendSuccess(res, await service.moveTaskToNextDay(req.user!.userId, req.params.id as string), 'Task moved to next day'); }
  catch (err) { next(err); }
};

// POST /planner/bulk-next-day — bulk move to next day
export const bulkMoveToNextDay = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array required' });
    }
    return sendSuccess(res, await service.bulkMoveTasksToNextDay(req.user!.userId, ids), 'Tasks moved to next day');
  }
  catch (err) { next(err); }
};
