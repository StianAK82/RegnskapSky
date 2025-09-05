import { Router } from 'express';
import { engagementController } from '../modules/engagements/controller';
// Using placeholder middleware for now
const authenticateToken = (req: any, res: any, next: any) => {
  // TODO: Implement authentication
  req.user = { tenantId: 'default-tenant', email: 'test@example.com', id: 'test-user' };
  next();
};

const router = Router();

// Client routes
router.post('/clients', authenticateToken, engagementController.createClient);
router.get('/clients', authenticateToken, engagementController.getClients);
router.get('/clients/:clientId', authenticateToken, engagementController.getClient);
router.put('/clients/:clientId', authenticateToken, engagementController.updateClient);

// Engagement routes
router.post('/clients/:clientId/engagements', authenticateToken, engagementController.createEngagement);
router.post('/engagements', authenticateToken, engagementController.createEngagement); // Alias route
router.get('/clients/:clientId/engagements', authenticateToken, engagementController.getEngagements);
router.get('/engagements/:engagementId', authenticateToken, engagementController.getEngagement);
router.get('/engagements/:engagementId/view-model', authenticateToken, engagementController.getEngagementViewModel);
router.put('/engagements/:engagementId', authenticateToken, engagementController.updateEngagement);
router.post('/engagements/:engagementId/finalize', authenticateToken, engagementController.finalizeEngagement);

// Report routes as specified
router.get('/reports/mrr', authenticateToken, engagementController.getMrrReport);
router.get('/reports/hourly-rate-distribution', authenticateToken, engagementController.getHourlyRateReport);
router.get('/reports/license-holders', authenticateToken, engagementController.getLicenseHolderReport);
router.get('/reports/termination-window', authenticateToken, engagementController.getTerminationWindowReport);

export { router as engagementRoutes };