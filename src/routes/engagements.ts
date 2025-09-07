import { Router } from 'express';
import { EngagementController } from '../modules/engagements/controller';
import { authenticateToken } from '../../server/auth';

const router = Router();
const engagementController = new EngagementController();

// NOTE: Client CRUD routes removed to avoid conflict with main routes in server/routes.ts
// Main client routes are handled in server/routes.ts with proper UUID validation

// Engagement routes
router.post('/clients/:clientId/engagements', authenticateToken as any, (req: any, res: any) => engagementController.createEngagement(req, res));
router.post('/engagements', authenticateToken as any, (req: any, res: any) => engagementController.createEngagement(req, res)); // Alias route
router.get('/clients/:clientId/engagements', authenticateToken as any, (req: any, res: any) => engagementController.getEngagements(req, res));
router.get('/engagements/:engagementId', authenticateToken as any, (req: any, res: any) => engagementController.getEngagement(req, res));
router.get('/engagements/:engagementId/view-model', authenticateToken as any, (req: any, res: any) => engagementController.getEngagementViewModel(req, res));
router.get('/clients/:clientId/engagements/:engagementId', authenticateToken as any, (req: any, res: any) => engagementController.getEngagement(req, res));
router.get('/clients/:clientId/engagements/:engagementId/view-model', authenticateToken as any, (req: any, res: any) => engagementController.getEngagementViewModel(req, res));
router.put('/engagements/:engagementId', authenticateToken as any, (req: any, res: any) => engagementController.updateEngagement(req, res));
router.post('/engagements/:engagementId/finalize', authenticateToken as any, (req: any, res: any) => engagementController.finalizeEngagement(req, res));

// Report routes as specified
router.get('/reports/mrr', authenticateToken as any, (req: any, res: any) => engagementController.getMrrReport(req, res));
router.get('/reports/hourly-rate-distribution', authenticateToken as any, (req: any, res: any) => engagementController.getHourlyRateReport(req, res));
router.get('/reports/license-holders', authenticateToken as any, (req: any, res: any) => engagementController.getLicenseHolderReport(req, res));
router.get('/reports/termination-window', authenticateToken as any, (req: any, res: any) => engagementController.getTerminationWindowReport(req, res));

export { router as engagementRoutes };