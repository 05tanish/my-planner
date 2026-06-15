import { Router } from 'express';
import { hackathonController } from './hackathons.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

router.get('/', hackathonController.getAll);
router.get('/stats', hackathonController.getStats);
router.get('/upcoming', hackathonController.getUpcoming);
router.get('/:id', hackathonController.getOne);
router.post('/', hackathonController.create);
router.patch('/:id', hackathonController.update);
router.delete('/:id', hackathonController.delete);

export default router;
