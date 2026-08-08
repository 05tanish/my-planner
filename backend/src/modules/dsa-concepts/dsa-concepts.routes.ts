import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import * as c from './dsa-concepts.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/', c.list);
router.get('/:id', c.getOne);
router.post('/', c.create);
router.patch('/:id', c.update);
router.delete('/:id', c.remove);
router.patch('/:id/favorite', c.toggleFavorite);

export default router;
