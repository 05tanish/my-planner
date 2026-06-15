import { Router } from 'express';
import { interviewController } from './interviews.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/', interviewController.getAll);
router.get('/stats', interviewController.getStats);
router.get('/due', interviewController.getDueForRevision);
router.get('/search', interviewController.search);
router.get('/:id', interviewController.getOne);
router.post('/', interviewController.create);
router.patch('/:id', interviewController.update);
router.delete('/:id', interviewController.delete);
router.post('/:id/revise', interviewController.markRevised);
router.post('/:id/favorite', interviewController.toggleFavorite);

export default router;
