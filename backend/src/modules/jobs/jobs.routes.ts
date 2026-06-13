import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import * as c from './jobs.controller';

const router = Router();
router.use(authenticate);

router.get('/', c.list);
router.post('/', c.create);
router.patch('/:id', c.update);
router.delete('/:id', c.remove);

export default router;
