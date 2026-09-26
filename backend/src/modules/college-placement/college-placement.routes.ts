import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { uploadSingleMemory } from '../../middleware/upload.middleware';
import { collegePlacementController } from './college-placement.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// List and create
router.get('/', collegePlacementController.list);
router.get('/stats', collegePlacementController.getStats);
router.post('/', uploadSingleMemory('resume'), collegePlacementController.create);

// Single placement operations
router.get('/:id', collegePlacementController.getOne);
router.patch('/:id', uploadSingleMemory('resume'), collegePlacementController.update);
router.delete('/:id', collegePlacementController.remove);

// Resume-specific operations
router.delete('/:id/resume', collegePlacementController.deleteResume);

export default router;

