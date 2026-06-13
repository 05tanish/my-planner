import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import * as service from './notes.service';
import { sendSuccess, sendCreated } from '../../utils/response';

export const create = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { return sendCreated(res, await service.create(req.user!.userId, req.body)); } catch (e) { next(e); }
};
export const list = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { return sendSuccess(res, await service.list(req.user!.userId, req.query)); } catch (e) { next(e); }
};
export const getOne = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { return sendSuccess(res, await service.getOne(req.user!.userId, req.params.id as string)); } catch (e) { next(e); }
};
export const update = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { return sendSuccess(res, await service.update(req.user!.userId, req.params.id as string, req.body), 'Note updated'); } catch (e) { next(e); }
};
export const remove = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { await service.remove(req.user!.userId, req.params.id as string); return sendSuccess(res, null, 'Note deleted'); } catch (e) { next(e); }
};
export const importNote = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    const note = await service.importNote(req.user!.userId, req.file);
    return sendCreated(res, note, 'Note imported successfully');
  } catch (e) {
    next(e);
  }
};
