import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import * as c from './analytics.controller';

const router = Router();
router.use(authenticate);

router.get('/productivity', c.getProductivityLogs);
router.post('/productivity', c.logProductivity);
router.get('/snapshots', c.getAnalyticsSnapshots);
router.post('/snapshots/trigger', c.triggerDailySnapshot);

export default router;
