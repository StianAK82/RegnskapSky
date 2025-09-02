import { Request, Response } from 'express';
import { billingService } from './service';
import type { AuthRequest } from '../../server/auth';

export class BillingController {
  async getSystemBilling(req: AuthRequest, res: Response) {
    try {
      // Sjekk at kun systemets eier har tilgang
      if (req.user!.email !== 'stian@zaldo.no') {
        return res.status(403).json({ message: 'Kun systemets eier har tilgang til faktureringsdata' });
      }

      const { format } = req.query;
      const tenants = await billingService.getAllTenantsBilling();

      // Hvis Excel-eksport er forespurt
      if (format === 'excel') {
        const buffer = await billingService.generateExcelReport(tenants);
        const filename = `systemfakturering_${new Date().toISOString().split('T')[0]}.xlsx`;
        
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
        return;
      }

      res.json(tenants);
    } catch (error: any) {
      console.error('Error fetching system billing data:', error);
      res.status(500).json({ message: 'Feil ved henting av faktureringsoversikt: ' + error.message });
    }
  }
}

export const billingController = new BillingController();