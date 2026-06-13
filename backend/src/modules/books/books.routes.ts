import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { uploadSingle } from '../../middleware/upload.middleware';
import * as c from './books.controller';

const router = Router();
router.use(authenticate);

router.get('/', c.list);
router.post('/', uploadSingle('book'), c.create);
router.get('/:id', c.getOne);
router.patch('/:id', uploadSingle('book'), c.update);
router.delete('/:id', c.remove);

export default router;
