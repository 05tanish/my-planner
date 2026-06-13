import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { uploadSingle } from '../../middleware/upload.middleware';
import * as c from './notes.controller';

const router = Router();
router.use(authenticate);

router.get('/', c.list);
router.post('/', c.create);
router.post('/import', uploadSingle('file'), c.importNote);
router.get('/:id', c.getOne);
router.patch('/:id', c.update);
router.delete('/:id', c.remove);

export default router;
