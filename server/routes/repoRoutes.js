import express from 'express';
import { indexRepository, askQuestion, generateDiagram } from '../controllers/repoController.js';

const router = express.Router();

router.post('/index', indexRepository);
router.post('/query', askQuestion);
router.post('/diagram', generateDiagram);

export default router;

