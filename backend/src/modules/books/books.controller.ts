import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import * as service from './books.service';
import { sendSuccess, sendCreated } from '../../utils/response';
import { uploadFile } from '../../services/storage.service';

export const create = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const body = { ...req.body };
    if (req.file) {
      body.fileUrl = await uploadFile(req.file, 'books');
    }
    if (body.totalPages !== undefined && body.totalPages !== '') {
      body.totalPages = parseInt(body.totalPages, 10);
    }
    if (body.currentPage !== undefined && body.currentPage !== '') {
      body.currentPage = parseInt(body.currentPage, 10);
    }
    const book = await service.create(req.user!.userId, body);
    return sendCreated(res, book);
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
    const book = await service.getOne(req.user!.userId, req.params.id as string);
    return sendSuccess(res, book);
  } catch (e) {
    next(e);
  }
};

export const update = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const body = { ...req.body };
    if (req.file) {
      body.fileUrl = await uploadFile(req.file, 'books');
    }
    if (body.totalPages !== undefined && body.totalPages !== '') {
      body.totalPages = parseInt(body.totalPages, 10);
    }
    if (body.currentPage !== undefined && body.currentPage !== '') {
      body.currentPage = parseInt(body.currentPage, 10);
    }
    const book = await service.update(req.user!.userId, req.params.id as string, body);
    return sendSuccess(res, book, 'Book updated');
  } catch (e) {
    next(e);
  }
};

export const remove = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await service.remove(req.user!.userId, req.params.id as string);
    return sendSuccess(res, null, 'Book deleted');
  } catch (e) {
    next(e);
  }
};
