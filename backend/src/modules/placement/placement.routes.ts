import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { uploadSingle } from '../../middleware/upload.middleware';
import { placementController } from './placement.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// List and create
router.get('/', placementController.list);
router.get('/topics', placementController.getTopics);
router.get('/report', placementController.getReport);
router.post('/', uploadSingle('attachment'), placementController.create);

// Single note operations
router.get('/:id', placementController.getOne);
router.get('/:id/report', placementController.getOneReport);
router.patch('/:id', uploadSingle('attachment'), placementController.update);
router.delete('/:id', placementController.remove);

export default router;
