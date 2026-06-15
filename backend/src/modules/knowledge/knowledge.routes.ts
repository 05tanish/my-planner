import { Router } from 'express';
import { knowledgeController } from './knowledge.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

router.get('/', knowledgeController.getAll);
router.get('/stats', knowledgeController.getStats);
router.get('/search', knowledgeController.search);
router.get('/:id', knowledgeController.getOne);
router.post('/capture', knowledgeController.captureFromUrl);
router.post('/research', knowledgeController.research);
router.post('/', knowledgeController.create);
router.patch('/:id', knowledgeController.update);
router.delete('/:id', knowledgeController.delete);
router.post('/:id/link-dsa', knowledgeController.linkToDsa);
router.post('/:id/link-projects', knowledgeController.linkToProjects);
router.post('/:id/link-questions', knowledgeController.linkToQuestions);

export default router;
