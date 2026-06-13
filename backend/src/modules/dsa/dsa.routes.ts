import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import * as c from './dsa.controller';

const router = Router();
router.use(authenticate);

router.get('/stats', c.stats);
router.get('/revisions/due', c.dueRevisions);
router.patch('/revisions/:revisionId/complete', c.completeRevision);
router.get('/daily-goal', c.getDailyGoal);
router.post('/daily-goal', c.toggleDailyGoal);
router.get('/profile-stats', c.getProfileStats);
router.get('/', c.list);
router.post('/', c.create);
router.get('/:id', c.getOne);
router.patch('/:id', c.update);
router.delete('/:id', c.remove);

export default router;
