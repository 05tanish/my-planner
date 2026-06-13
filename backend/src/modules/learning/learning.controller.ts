import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import * as service from './learning.service';
import { sendSuccess, sendCreated } from '../../utils/response';

export const create = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const entry = await service.create(req.user!.userId, req.body);
    return sendCreated(res, entry);
  } catch (e) {
    next(e);
  }
};

export const list = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await service.list(req.user!.userId, req.query);
    return sendSuccess(res, result);
  } catch (e) {
    next(e);
  }
};

export const getOne = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const entry = await service.getOne(req.user!.userId, req.params.id as string);
    return sendSuccess(res, entry);
  } catch (e) {
    next(e);
  }
};

export const update = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const entry = await service.update(req.user!.userId, req.params.id as string, req.body);
    return sendSuccess(res, entry, 'Learning entry updated');
  } catch (e) {
    next(e);
  }
};

export const remove = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await service.remove(req.user!.userId, req.params.id as string);
    return sendSuccess(res, null, 'Learning entry deleted');
  } catch (e) {
    next(e);
  }
};
