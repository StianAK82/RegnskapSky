import { Request, Response } from 'express';
import { engagementService } from './service';
import { insertClientSchema, insertEngagementSchema } from './schema';
// Define AuthRequest type locally for now
interface AuthRequest extends Request {
  user?: {
    tenantId: string;
    email: string;
    id: string;
  };
}

export class EngagementController {
  private engagementService = engagementService;
  // Client endpoints
  async createClient(req: AuthRequest, res: Response) {
    try {
      const validatedData = insertClientSchema.parse({
        ...req.body,
        tenantId: req.user!.tenantId
      });

      const client = await engagementService.createClient(validatedData);
      res.status(201).json(client);
    } catch (error: any) {
      console.error('Error creating client:', error);
      res.status(400).json({ message: 'Feil ved opprettelse av klient: ' + error.message });
    }
  }

  async getClients(req: AuthRequest, res: Response) {
    try {
      const clients = await engagementService.getClientsByTenant(req.user!.tenantId);
      res.json(clients);
    } catch (error: any) {
      console.error('Error fetching clients:', error);
      res.status(500).json({ message: 'Feil ved henting av klienter: ' + error.message });
    }
  }

  async getClient(req: AuthRequest, res: Response) {
    try {
      const client = await engagementService.getClientById(req.params.clientId, req.user!.tenantId);
      if (!client) {
        return res.status(404).json({ message: 'Klient ikke funnet' });
      }
      res.json(client);
    } catch (error: any) {
      console.error('Error fetching client:', error);
      res.status(500).json({ message: 'Feil ved henting av klient: ' + error.message });
    }
  }

  async updateClient(req: AuthRequest, res: Response) {
    try {
      const updates = insertClientSchema.partial().parse(req.body);
      const client = await engagementService.updateClient(
        req.params.clientId, 
        req.user!.tenantId, 
        updates
      );
      res.json(client);
    } catch (error: any) {
      console.error('Error updating client:', error);
      res.status(400).json({ message: 'Feil ved oppdatering av klient: ' + error.message });
    }
  }

  // Engagement endpoints
  async createEngagement(req: AuthRequest, res: Response) {
    try {
      console.log('🔍 POST /api/clients/:clientId/engagements - Creating engagement:', { 
        clientId: req.params.clientId, 
        tenantId: req.user!.tenantId 
      });

      // Pass through the full request body without schema filtering for JSONB fields
      const validatedData = {
        ...req.body,
        clientId: req.params.clientId,
        tenantId: req.user!.tenantId,
        // Ensure required fields have defaults
        status: req.body.status || 'draft',
        validFrom: new Date(req.body.validFrom || new Date()),
        licenseHolder: req.body.licenseHolder || 'client'
      };

      const engagement = await engagementService.createEngagement(validatedData);
      
      console.log('✅ POST /api/clients/:clientId/engagements - Engagement created:', { engagementId: engagement.id });
      res.status(201).json({ engagementId: engagement.id });
    } catch (error: any) {
      console.error('❌ POST /api/clients/:clientId/engagements - Error creating engagement:', error);
      res.status(400).json({ message: 'Feil ved opprettelse av oppdrag: ' + error.message });
    }
  }

  async getEngagements(req: AuthRequest, res: Response) {
    try {
      const { clientId } = req.params;
      const engagements = await engagementService.getEngagementsByClient(clientId, req.user!.tenantId);
      res.json(engagements);
    } catch (error: any) {
      console.error('Error fetching engagements:', error);
      res.status(500).json({ message: 'Feil ved henting av oppdrag: ' + error.message });
    }
  }

  async getEngagement(req: AuthRequest, res: Response) {
    try {
      const engagement = await engagementService.getEngagementDetails(
        req.params.engagementId, 
        req.user!.tenantId
      );
      if (!engagement) {
        return res.status(404).json({ message: 'Oppdrag ikke funnet' });
      }
      res.json(engagement);
    } catch (error: any) {
      console.error('Error fetching engagement:', error);
      res.status(500).json({ message: 'Feil ved henting av oppdrag: ' + error.message });
    }
  }

  // Get engagement view-model for UI display and PDF generation
  async getEngagementViewModel(req: AuthRequest, res: Response) {
    try {
      const viewModel = await engagementService.getEngagementViewModel(
        req.params.engagementId, 
        req.user!.tenantId
      );
      if (!viewModel) {
        return res.status(404).json({ message: 'Oppdrag eller klient ikke funnet' });
      }
      res.json(viewModel);
    } catch (error: any) {
      console.error('Error fetching engagement view-model:', error);
      res.status(500).json({ message: 'Feil ved henting av oppdrag: ' + error.message });
    }
  }

  async updateEngagement(req: AuthRequest, res: Response) {
    try {
      const updates = insertEngagementSchema.partial().parse(req.body);
      const engagement = await engagementService.updateEngagement(
        req.params.engagementId, 
        req.user!.tenantId, 
        updates
      );
      res.json(engagement);
    } catch (error: any) {
      console.error('Error updating engagement:', error);
      res.status(400).json({ message: 'Feil ved oppdatering av oppdrag: ' + error.message });
    }
  }

  // Finalize engagement - sets status to active and generates PDFs
  async finalizeEngagement(req: AuthRequest, res: Response) {
    try {
      const { engagementId } = req.params;
      const tenantId = req.user!.tenantId;

      const result = await this.engagementService.finalizeEngagement(engagementId, tenantId);
      res.json(result);
    } catch (error: any) {
      console.error('Finalize engagement error:', error);
      res.status(500).json({ message: error.message });
    }
  }

  // Report endpoints as specified
  async getMrrReport(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.user!.tenantId;
      const mrrData = await this.engagementService.getMrrReport(tenantId);
      res.json(mrrData);
    } catch (error: any) {
      console.error('MRR report error:', error);
      res.status(500).json({ message: error.message });
    }
  }

  async getHourlyRateReport(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.user!.tenantId;
      const rateData = await this.engagementService.getHourlyRateDistribution(tenantId);
      res.json(rateData);
    } catch (error: any) {
      console.error('Hourly rate report error:', error);
      res.status(500).json({ message: error.message });
    }
  }

  async getLicenseHolderReport(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.user!.tenantId;
      const licenseData = await this.engagementService.getLicenseHolderReport(tenantId);
      res.json(licenseData);
    } catch (error: any) {
      console.error('License holder report error:', error);
      res.status(500).json({ message: error.message });
    }
  }

  async getTerminationWindowReport(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.user!.tenantId;
      const { months = '3' } = req.query;
      const terminationData = await this.engagementService.getTerminationWindowReport(tenantId, parseInt(months as string));
      res.json(terminationData);
    } catch (error: any) {
      console.error('Termination window report error:', error);
      res.status(500).json({ message: error.message });
    }
  }
}

export const engagementController = new EngagementController();