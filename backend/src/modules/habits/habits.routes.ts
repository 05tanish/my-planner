import { Router } from 'express';
import { habitController } from './habits.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.post('/log', habitController.logHabit);
router.get('/', habitController.getHabits);
router.get('/stats', habitController.getStats);
router.get('/heatmap/:habitType', habitController.getHeatmap);
router.get('/daily/:date?', habitController.getDailyHabits);
router.get('/consistency/:habitType', habitController.getConsistency);

export default router;
