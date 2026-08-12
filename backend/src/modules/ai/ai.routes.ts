import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import {
  summarizeNote,
  generateMockInterview,
  generateReadme,
  explainDsaConcept,
  suggestSchedule,
} from './ai.controller';

const router = Router();

router.use(authenticate);

router.post('/summarize-note', summarizeNote);
router.post('/mock-interview', generateMockInterview);
router.post('/generate-readme', generateReadme);
router.post('/explain-dsa', explainDsaConcept);
router.post('/schedule', suggestSchedule);

export default router;
