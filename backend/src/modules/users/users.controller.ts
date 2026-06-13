import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import * as usersService from './users.service';
import { sendSuccess, sendCreated } from '../../utils/response';

export const list = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const users = await usersService.listUsers();
    return sendSuccess(res, users);
  } catch (err) {
    next(err);
  }
};

export const create = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await usersService.createUser(req.body);
    return sendCreated(res, user, 'User created successfully');
  } catch (err) {
    next(err);
  }
};

export const update = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await usersService.updateUser(req.params.id as string, req.body);
    return sendSuccess(res, user, 'User updated successfully');
  } catch (err) {
    next(err);
  }
};

export const remove = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await usersService.deleteUser(req.params.id as string, req.user!.userId);
    return sendSuccess(res, null, 'User deleted successfully');
  } catch (err) {
    next(err);
  }
};
