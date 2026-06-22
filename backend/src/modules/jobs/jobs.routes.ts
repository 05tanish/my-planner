import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import multer from 'multer';
import * as c from './jobs.controller';
import * as rc from './resume.controller';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB

router.use(authenticate);

// Job CRUD
router.get('/', c.list);
router.post('/', c.create);
router.patch('/:id', c.update);
router.delete('/:id', c.remove);

// Resume library
router.get('/resumes', rc.list);
router.post('/resumes', upload.single('file'), rc.upload);
router.patch('/resumes/:id', rc.update);
router.delete('/resumes/:id', rc.remove);

// Attach resume to a job
router.patch('/:jobId/resume', rc.attachToJob);

export default router;
