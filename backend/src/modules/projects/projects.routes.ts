import { Router } from 'express';
import { projectController } from './projects.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Project routes
router.get('/', projectController.getAll);
router.get('/stats', projectController.getStats);
router.get('/:id', projectController.getOne);
router.post('/', projectController.create);
router.patch('/:id', projectController.update);
router.delete('/:id', projectController.delete);
router.patch('/:id/progress', projectController.updateProgress);

// Feature routes
router.post('/:id/features', projectController.addFeature);
router.patch('/features/:featureId', projectController.updateFeature);
router.delete('/features/:featureId', projectController.deleteFeature);

export default router;
