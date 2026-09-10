import { Router } from 'express';
import { SearchController } from '../controllers/search.controller.js';
import { optionalAuth } from '../middleware/auth.js';
import { searchRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.get('/', searchRateLimiter, optionalAuth, SearchController.search);

export default router;

