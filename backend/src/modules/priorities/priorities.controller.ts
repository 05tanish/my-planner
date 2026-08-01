import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import * as service from './priorities.service';
import { sendSuccess, sendCreated } from '../../utils/response';

export const create = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    return sendCreated(res, await service.createPriority(req.user!.userId, req.body));
  } catch (err) {
    next(err);
  }
};

export const list = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const query = {
      ...req.query,
      page: Number(req.query.page || 1),
      limit: Number(req.query.limit || 50),
    };
    return sendSuccess(res, await service.getPriorities(req.user!.userId, query as any));
  } catch (err) {
    next(err);
  }
};

export const getById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    return sendSuccess(res, await service.getPriorityById(req.user!.userId, req.params.id as string));
  } catch (err) {
    next(err);
  }
};

export const update = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    return sendSuccess(
      res,
      await service.updatePriority(req.user!.userId, req.params.id as string, req.body),
      'Priority updated'
    );
  } catch (err) {
    next(err);
  }
};

export const remove = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await service.deletePriority(req.user!.userId, req.params.id as string);
    return sendSuccess(res, null, 'Priority deleted');
  } catch (err) {
    next(err);
  }
};

export const complete = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    return sendSuccess(
      res,
      await service.completePriority(req.user!.userId, req.params.id as string),
      'Priority completed'
    );
  } catch (err) {
    next(err);
  }
};

export const reorder = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'items array required' });
    }
    return sendSuccess(res, await service.reorderPriorities(req.user!.userId, items), 'Priorities reordered');
  } catch (err) {
    next(err);
  }
};

export const duplicate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    return sendCreated(
      res,
      await service.duplicatePriority(req.user!.userId, req.params.id as string),
      'Priority duplicated'
    );
  } catch (err) {
    next(err);
  }
};

export const getStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    return sendSuccess(res, await service.getStats(req.user!.userId));
  } catch (err) {
    next(err);
  }
};
