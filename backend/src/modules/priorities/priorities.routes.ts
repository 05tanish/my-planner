import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import * as c from './priorities.controller';

const router = Router();
router.use(authenticate);

router.get('/stats', c.getStats);
router.get('/', c.list);
router.get('/:id', c.getById);
router.post('/', c.create);
router.post('/reorder', c.reorder);
router.post('/:id/duplicate', c.duplicate);
router.patch('/:id/complete', c.complete);
router.patch('/:id', c.update);
router.delete('/:id', c.remove);

export default router;
