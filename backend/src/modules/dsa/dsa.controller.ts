import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import * as dsaService from './dsa.service';
import { sendSuccess, sendCreated } from '../../utils/response';
import { createDsaProblemSchema, updateDsaProblemSchema, dsaQuerySchema } from './dsa.schema';

export const create = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const dto = createDsaProblemSchema.parse(req.body);
    const problem = await dsaService.createProblem(req.user!.userId, dto);
    return sendCreated(res, problem, 'Problem added and revision schedule created');
  } catch (err) { next(err); }
};

export const list = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const query = dsaQuerySchema.parse(req.query);
    const result = await dsaService.getProblems(req.user!.userId, query);
    return sendSuccess(res, result);
  } catch (err) { next(err); }
};

export const getOne = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const problem = await dsaService.getProblemById(req.user!.userId, req.params.id as string);
    return sendSuccess(res, problem);
  } catch (err) { next(err); }
};

export const update = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const dto = updateDsaProblemSchema.parse(req.body);
    const problem = await dsaService.updateProblem(req.user!.userId, req.params.id as string, dto);
    return sendSuccess(res, problem, 'Problem updated');
  } catch (err) { next(err); }
};

export const remove = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await dsaService.deleteProblem(req.user!.userId, req.params.id as string);
    return sendSuccess(res, null, 'Problem deleted');
  } catch (err) { next(err); }
};

export const dueRevisions = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const revisions = await dsaService.getDueRevisions(req.user!.userId);
    return sendSuccess(res, revisions);
  } catch (err) { next(err); }
};

export const completeRevision = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const revision = await dsaService.completeRevision(req.user!.userId, req.params.revisionId as string);
    return sendSuccess(res, revision, 'Revision marked complete');
  } catch (err) { next(err); }
};

export const stats = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await dsaService.getStats(req.user!.userId);
    return sendSuccess(res, data);
  } catch (err) { next(err); }
};

export const getDailyGoal = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await dsaService.getDailyGoal(req.user!.userId);
    return sendSuccess(res, data);
  } catch (err) { next(err); }
};

export const toggleDailyGoal = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { completed } = req.body;
    const data = await dsaService.toggleDailyGoal(req.user!.userId, !!completed);
    return sendSuccess(res, data, 'Daily goal status updated');
  } catch (err) { next(err); }
};

export const getProfileStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await dsaService.getProfileStats(req.user!.userId);
    return sendSuccess(res, data);
  } catch (err) { next(err); }
};
