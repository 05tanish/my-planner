import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { uploadSingle } from '../../middleware/upload.middleware';
import * as c from './placement.controller';

const router = Router();
router.use(authenticate);

router.get('/', c.list);
router.get('/report', c.getReport);
router.post('/', uploadSingle('attachment'), c.create);
router.get('/:id', c.getOne);
router.get('/:id/report', c.getOneReport);
router.patch('/:id', uploadSingle('attachment'), c.update);
router.delete('/:id', c.remove);

export default router;
