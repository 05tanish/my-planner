import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import * as c from './github.controller';

const router = Router();
router.use(authenticate);

router.get('/stats', c.getStreakStats);
router.get('/', c.listActivities);
router.post('/', c.logActivity);

export default router;
