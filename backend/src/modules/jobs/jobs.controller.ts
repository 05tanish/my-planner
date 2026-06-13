import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import * as service from './jobs.service';
import { sendSuccess, sendCreated } from '../../utils/response';

export const create = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { return sendCreated(res, await service.create(req.user!.userId, req.body)); } catch (e) { next(e); }
};
export const list = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { return sendSuccess(res, await service.list(req.user!.userId, req.query)); } catch (e) { next(e); }
};
export const update = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { return sendSuccess(res, await service.update(req.user!.userId, req.params.id as string, req.body), 'Job updated'); } catch (e) { next(e); }
};
export const remove = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { await service.remove(req.user!.userId, req.params.id as string); return sendSuccess(res, null, 'Job deleted'); } catch (e) { next(e); }
};
