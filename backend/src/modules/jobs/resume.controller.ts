import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import * as service from './resume.service';
import { sendSuccess, sendCreated } from '../../utils/response';

export const list = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { return sendSuccess(res, await service.listResumes(req.user!.userId)); }
  catch (e) { next(e); }
};

export const upload = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded.' });
    return sendCreated(res, await service.uploadResume(req.user!.userId, req.file, req.body));
  } catch (e) { next(e); }
};

export const update = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { return sendSuccess(res, await service.updateResume(req.user!.userId, req.params.id as string, req.body), 'Resume updated'); }
  catch (e) { next(e); }
};

export const remove = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await service.deleteResume(req.user!.userId, req.params.id as string);
    return sendSuccess(res, null, 'Resume deleted');
  } catch (e) { next(e); }
};

export const attachToJob = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { resumeId } = req.body;
    return sendSuccess(res, await service.attachResumeToJob(req.user!.userId, req.params.jobId as string, resumeId ?? null), 'Resume attached to job');
  } catch (e) { next(e); }
};
