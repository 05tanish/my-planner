import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import * as service from './dsa-concepts.service';
import { sendSuccess, sendCreated } from '../../utils/response';
import { createDsaConceptSchema, updateDsaConceptSchema, dsaConceptQuerySchema } from './dsa-concepts.schema';

export const list = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const query = dsaConceptQuerySchema.parse(req.query);
    const result = await service.getConcepts(req.user!.userId, query);
    return sendSuccess(res, result);
  } catch (err) { next(err); }
};

export const getOne = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const concept = await service.getConceptById(req.user!.userId, req.params.id as string);
    return sendSuccess(res, concept);
  } catch (err) { next(err); }
};

export const create = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const dto = createDsaConceptSchema.parse(req.body);
    const concept = await service.createConcept(req.user!.userId, dto);
    return sendCreated(res, concept, 'DSA Concept created');
  } catch (err) { next(err); }
};

export const update = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const dto = updateDsaConceptSchema.parse(req.body);
    const concept = await service.updateConcept(req.user!.userId, req.params.id as string, dto);
    return sendSuccess(res, concept, 'DSA Concept updated');
  } catch (err) { next(err); }
};

export const remove = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await service.deleteConcept(req.user!.userId, req.params.id as string);
    return sendSuccess(res, null, 'DSA Concept deleted');
  } catch (err) { next(err); }
};

export const toggleFavorite = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const concept = await service.toggleFavorite(req.user!.userId, req.params.id as string);
    return sendSuccess(res, concept, concept.isFavorite ? 'Added to favorites' : 'Removed from favorites');
  } catch (err) { next(err); }
};
