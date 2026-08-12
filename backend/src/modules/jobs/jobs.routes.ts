import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { extensionOrSessionAuth } from '../../middleware/extension-auth.middleware';
import multer from 'multer';
import * as c from './jobs.controller';
import * as rc from './resume.controller';
import * as importCtrl from './job-import.controller';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit (increased for screenshots)
});

// Extension import endpoint (accepts both extension token and session auth)
router.post('/import', upload.single('screenshot'), extensionOrSessionAuth, importCtrl.importJobHandler);

// All other routes require standard session auth
router.use(authenticate);

// Job CRUD
router.get('/', c.list);
router.post('/', c.create);
router.get('/:id', c.getOne);
router.patch('/:id', c.update);
router.delete('/:id', c.remove);

// Per-Job Specific Resume Endpoints
router.post('/:id/resume', upload.single('file'), c.uploadResume);
router.delete('/:id/resume', c.deleteResume);
router.get('/:id/resume/download', c.downloadResume);

// Resume library (General)
router.get('/resumes', rc.list);
router.post('/resumes', upload.single('file'), rc.upload);
router.patch('/resumes/:id', rc.update);
router.delete('/resumes/:id', rc.remove);

// Attach general library resume to a job
router.patch('/:jobId/resume', rc.attachToJob);

export default router;

