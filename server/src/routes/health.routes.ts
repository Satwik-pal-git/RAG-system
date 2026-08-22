import { Router } from 'express';
import { getHealth, getAppInfo } from '../controllers/health.controller';

const router = Router();

router.get('/health', getHealth);
router.get('/info', getAppInfo);

export default router;
