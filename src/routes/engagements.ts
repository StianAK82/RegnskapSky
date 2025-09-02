import { Router } from 'express';
import { engagementController } from '../modules/engagements/controller';
import { authenticateToken } from '../server/auth';

const router = Router();

// Client routes
router.post('/clients', authenticateToken, engagementController.createClient);
router.get('/clients', authenticateToken, engagementController.getClients);
router.get('/clients/:clientId', authenticateToken, engagementController.getClient);
router.put('/clients/:clientId', authenticateToken, engagementController.updateClient);

// Engagement routes
router.post('/clients/:clientId/engagements', authenticateToken, engagementController.createEngagement);
router.get('/clients/:clientId/engagements', authenticateToken, engagementController.getEngagements);
router.get('/engagements/:engagementId', authenticateToken, engagementController.getEngagement);
router.put('/engagements/:engagementId', authenticateToken, engagementController.updateEngagement);

export { router as engagementRoutes };