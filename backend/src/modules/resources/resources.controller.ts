import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import * as service from './resources.service';
import { sendSuccess, sendCreated } from '../../utils/response';

// --- Folder Endpoints ---
export const createFolder = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const folder = await service.createFolder(req.user!.userId, req.body);
    return sendCreated(res, folder);
  } catch (e) {
    next(e);
  }
};

export const listFolders = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const folders = await service.listFolders(req.user!.userId);
    return sendSuccess(res, folders);
  } catch (e) {
    next(e);
  }
};

export const updateFolder = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const folder = await service.updateFolder(req.user!.userId, req.params.id as string, req.body);
    return sendSuccess(res, folder, 'Folder updated');
  } catch (e) {
    next(e);
  }
};

export const deleteFolder = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await service.deleteFolder(req.user!.userId, req.params.id as string);
    return sendSuccess(res, null, 'Folder deleted');
  } catch (e) {
    next(e);
  }
};

// --- Resource Endpoints ---
export const createResource = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const resource = await service.createResource(req.user!.userId, req.body);
    return sendCreated(res, resource);
  } catch (e) {
    next(e);
  }
};

export const listResources = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await service.listResources(req.user!.userId, req.query);
    return sendSuccess(res, result);
  } catch (e) {
    next(e);
  }
};

export const getOneResource = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const resource = await service.getOneResource(req.user!.userId, req.params.id as string);
    return sendSuccess(res, resource);
  } catch (e) {
    next(e);
  }
};

export const updateResource = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const resource = await service.updateResource(req.user!.userId, req.params.id as string, req.body);
    return sendSuccess(res, resource, 'Resource updated');
  } catch (e) {
    next(e);
  }
};

export const removeResource = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await service.removeResource(req.user!.userId, req.params.id as string);
    return sendSuccess(res, null, 'Resource deleted');
  } catch (e) {
    next(e);
  }
};

export const reorderResources = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    return sendSuccess(res, await service.reorderResources(req.user!.userId, req.body.items), 'Resources reordered');
  } catch (e) { next(e); }
};

export const reorderFolders = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    return sendSuccess(res, await service.reorderFolders(req.user!.userId, req.body.items), 'Folders reordered');
  } catch (e) { next(e); }
};

