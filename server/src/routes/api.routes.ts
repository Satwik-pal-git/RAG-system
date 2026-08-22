import { Router } from 'express';
import healthRoutes from './health.routes';
import itemRoutes from './item.routes';
import documentRoutes from './document.routes';
import chatRoutes from './chat.routes';

const router = Router();

// Mount individual domain routers
router.use('/', healthRoutes);
router.use('/items', itemRoutes);
router.use('/documents', documentRoutes);
router.use('/chat', chatRoutes);

export default router;
