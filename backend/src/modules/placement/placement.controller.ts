import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import * as service from './placement.service';
import { sendSuccess, sendCreated } from '../../utils/response';
import { uploadFile } from '../../services/storage.service';

export const create = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const body = { ...req.body };
    if (req.file) {
      body.fileUrl = await uploadFile(req.file, 'placement');
    }
    if (typeof body.tags === 'string') {
      body.tags = body.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
    }
    const note = await service.create(req.user!.userId, body);
    return sendCreated(res, note);
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
    const note = await service.getOne(req.user!.userId, req.params.id as string);
    return sendSuccess(res, note);
  } catch (e) {
    next(e);
  }
};

export const update = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const body = { ...req.body };
    if (req.file) {
      body.fileUrl = await uploadFile(req.file, 'placement');
    }
    if (typeof body.tags === 'string') {
      body.tags = body.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
    }
    const note = await service.update(req.user!.userId, req.params.id as string, body);
    return sendSuccess(res, note, 'Placement note updated');
  } catch (e) {
    next(e);
  }
};

export const remove = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await service.remove(req.user!.userId, req.params.id as string);
    return sendSuccess(res, null, 'Placement note deleted');
  } catch (e) {
    next(e);
  }
};

export const getOneReport = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const report = await service.generateSingleReport(req.user!.userId, req.params.id as string);
    return sendSuccess(res, report);
  } catch (e) {
    next(e);
  }
};

export const getReport = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const section = req.query.section as string;
    if (!section) {
      return res.status(400).json({ message: 'Section query parameter is required' });
    }
    const report = await service.generateSectionReport(req.user!.userId, section);
    return sendSuccess(res, report);
  } catch (e) {
    next(e);
  }
};
