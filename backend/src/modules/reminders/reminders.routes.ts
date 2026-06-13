import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import * as c from './reminders.controller';

const router = Router();
router.use(authenticate);

router.get('/', c.list);
router.post('/', c.create);
router.get('/:id', c.getOne);
router.patch('/:id', c.update);
router.delete('/:id', c.remove);

export default router;
