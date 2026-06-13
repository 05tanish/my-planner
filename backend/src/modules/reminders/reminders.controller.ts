import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import * as service from './reminders.service';
import { sendSuccess, sendCreated } from '../../utils/response';

export const create = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const reminder = await service.create(req.user!.userId, req.body);
    return sendCreated(res, reminder);
  } catch (e) {
    next(e);
  }
};

export const list = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const reminders = await service.list(req.user!.userId);
    return sendSuccess(res, reminders);
  } catch (e) {
    next(e);
  }
};

export const getOne = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const reminder = await service.getOne(req.user!.userId, req.params.id as string);
    return sendSuccess(res, reminder);
  } catch (e) {
    next(e);
  }
};

export const update = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const reminder = await service.update(req.user!.userId, req.params.id as string, req.body);
    return sendSuccess(res, reminder, 'Reminder updated');
  } catch (e) {
    next(e);
  }
};

export const remove = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await service.remove(req.user!.userId, req.params.id as string);
    return sendSuccess(res, null, 'Reminder deleted');
  } catch (e) {
    next(e);
  }
};
