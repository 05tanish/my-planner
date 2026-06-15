import { Router } from 'express';
import { alertController } from './alerts.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

router.get('/', alertController.getAll);
router.get('/stats', alertController.getStats);
router.post('/scan', alertController.scan);
router.post('/:id/dismiss', alertController.dismiss);
router.post('/dismiss-all', alertController.dismissAll);

export default router;
