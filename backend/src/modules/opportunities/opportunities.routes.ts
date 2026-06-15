import { Router } from 'express';
import { opportunityController } from './opportunities.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

router.get('/', opportunityController.getAll);
router.get('/stats', opportunityController.getStats);
router.get('/upcoming', opportunityController.getUpcoming);
router.get('/:id', opportunityController.getOne);
router.post('/', opportunityController.create);
router.patch('/:id', opportunityController.update);
router.delete('/:id', opportunityController.delete);

export default router;
