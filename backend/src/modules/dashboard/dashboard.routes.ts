import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import * as c from './dashboard.controller';

const router = Router();
router.use(authenticate);

router.get('/layout', c.getLayout);
router.patch('/layout', c.updateLayout);
router.get('/stats', c.getStats);

export default router;
