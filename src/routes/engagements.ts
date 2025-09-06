import { Router } from 'express';
import { EngagementController } from '../modules/engagements/controller';

// Using placeholder middleware for now
const authenticateToken = (req: any, res: any, next: any) => {
  // TODO: Implement authentication
  req.user = { tenantId: '00000000-0000-0000-0000-000000000001', email: 'test@example.com', id: 'test-user' };
  next();
};

const router = Router();
const engagementController = new EngagementController();

// NOTE: Client CRUD routes removed to avoid conflict with main routes in server/routes.ts
// Main client routes are handled in server/routes.ts with proper UUID validation

// Engagement routes
router.post('/clients/:clientId/engagements', authenticateToken, (req, res) => engagementController.createEngagement(req as any, res));
router.post('/engagements', authenticateToken, (req, res) => engagementController.createEngagement(req as any, res)); // Alias route
router.get('/clients/:clientId/engagements', authenticateToken, (req, res) => engagementController.getEngagements(req as any, res));
router.get('/engagements/:engagementId', authenticateToken, (req, res) => engagementController.getEngagement(req as any, res));
router.get('/engagements/:engagementId/view-model', authenticateToken, (req, res) => engagementController.getEngagementViewModel(req as any, res));
router.get('/clients/:clientId/engagements/:engagementId', authenticateToken, (req, res) => engagementController.getEngagement(req as any, res));
router.get('/clients/:clientId/engagements/:engagementId/view-model', authenticateToken, (req, res) => engagementController.getEngagementViewModel(req as any, res));
router.put('/engagements/:engagementId', authenticateToken, (req, res) => engagementController.updateEngagement(req as any, res));
router.post('/engagements/:engagementId/finalize', authenticateToken, (req, res) => engagementController.finalizeEngagement(req as any, res));

// Report routes as specified
router.get('/reports/mrr', authenticateToken, (req, res) => engagementController.getMrrReport(req as any, res));
router.get('/reports/hourly-rate-distribution', authenticateToken, (req, res) => engagementController.getHourlyRateReport(req as any, res));
router.get('/reports/license-holders', authenticateToken, (req, res) => engagementController.getLicenseHolderReport(req as any, res));
router.get('/reports/termination-window', authenticateToken, (req, res) => engagementController.getTerminationWindowReport(req as any, res));

export { router as engagementRoutes };