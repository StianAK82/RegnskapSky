import { Router } from 'express';
import { billingController } from '../modules/billing/controller';
import { authenticateToken } from '../server/auth';

const router = Router();

// System Owner Billing Routes (KUN for stian@zaldo.no)
router.get('/system-owner/billing', authenticateToken, billingController.getSystemBilling);

export { router as billingRoutes };