import express, { Request, Response, NextFunction } from 'express';
import { db } from './db';
import { storage } from './storage';
import { authenticateToken } from './auth';
import { registerRoutes } from './routes';
import { licensingService } from './services/licensing';
import { engagementRoutes } from '../src/routes/engagements';
import path from 'path';

const app = express();
app.use(express.json());
app.use('/api', engagementRoutes);

console.log('\n🚀 Task scheduler startet - sjekker oppgaver hvert minutt + daglige lisensoppgaver');

// Track when daily tasks were last run
let lastDailyRun = new Date(0); // Start with epoch to ensure first run

setInterval(async () => {
  try {
    const now = new Date();
    const nowStr = now.toLocaleString('nb-NO');
    console.log(`🔄 Sjekker gjentagende oppgaver... ${nowStr}`);
    
    // Minutely task: Generate upcoming tasks
    const totalGenerated = await storage.generateUpcomingTasks('70104b9b-1763-4158-a9b0-5c66cff9756d', 30);
    console.log(`📋 Fant ${totalGenerated} gjentagende oppgaver å prosessere`);
    
    // Daily task: Create license usage snapshots (run once per day)
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const lastDaily = new Date(lastDailyRun.getFullYear(), lastDailyRun.getMonth(), lastDailyRun.getDate());
    
    if (today.getTime() !== lastDaily.getTime()) {
      console.log(`📊 Kjører daglige lisensoppgaver... ${nowStr}`);
      
      try {
        // Get all tenants and create license usage snapshots
        const allTenants = await storage.getAllTenants();
        let snapshotsCreated = 0;
        
        for (const tenant of allTenants) {
          try {
            await licensingService.createLicenseUsageSnapshot(tenant.id, now);
            snapshotsCreated++;
          } catch (error) {
            console.error(`❌ Feil ved oppretting av lisens-snapshot for tenant ${tenant.id}:`, error);
          }
        }
        
        console.log(`✅ Opprettet ${snapshotsCreated} lisens-snapshots for ${allTenants.length} tenants`);
        lastDailyRun = now;
      } catch (error) {
        console.error('❌ Feil ved daglige lisensoppgaver:', error);
      }
    }
  } catch (error) {
    console.error('❌ Feil ved generering av oppgaver:', error);
  }
}, 60 * 1000);

// Setup server routes and start server
(async () => {
  // Register all API routes
  const server = await registerRoutes(app);

  // User management endpoints
  app.get('/api/user/:id', authenticateToken as any, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      res.json(user);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get all engagements for a client
  app.get("/api/clients/:clientId/engagements", authenticateToken as any, async (req: any, res) => {
  try {
    const { clientId } = req.params;
    
    const clientEngagements = await storage.getEngagementsByClient(clientId);
    
    const transformedEngagements = clientEngagements.map((e: any) => ({
      id: e.id,
      clientId: e.clientId,
      createdAt: e.createdAt,
      status: e.status,
      systemName: e.systemName,
      signatories: Array.isArray(e.signatories) ? e.signatories.length : 0,
      scopes: Array.isArray(e.scopes) ? e.scopes.length : 0,
      data: {
        systemName: e.systemName,
        licenseHolder: e.licenseHolder,
        adminAccess: e.adminAccess,
        signatories: e.signatories,
        scopes: e.scopes,
        pricing: e.pricing,
        dpas: e.dpas,
        status: e.status,
        validFrom: e.validFrom,
        includeStandardTerms: e.includeStandardTerms,
        includeDpa: e.includeDpa,
        includeItBilag: e.includeItBilag,
        version: e.version
      }
    }));
    
    console.log('🔍 Fetching engagements for client:', clientId);
    console.log('📊 Found engagements:', transformedEngagements.length);
    
    res.json(transformedEngagements);
    
  } catch (error: any) {
    console.error('❌ Error fetching engagements:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch engagements',
      error: error.message
    });
  }
});

  // Add PDF endpoint with configurable Content-Disposition (inline/attachment)
  app.get("/api/clients/:clientId/engagements/:engagementId/pdf", authenticateToken as any, async (req: any, res) => {
  try {
    const { clientId, engagementId } = req.params;
    const { disposition = 'attachment' } = req.query; // Default to attachment for backward compatibility
    
    // Find the engagement in database
    const engagement = await storage.getEngagement(engagementId);
    
    if (!engagement || engagement.clientId !== clientId) {
      return res.status(404).json({ message: 'Oppdragsavtale ikke funnet' });
    }
    
    // Fetch client data to get company name and organization number
    const client = await storage.getClient(clientId);
    
    if (!client) {
      return res.status(404).json({ message: 'Klient ikke funnet' });
    }
    
    // Generate PDF using view-model approach
    const { EngagementService } = await import('../src/modules/engagements/service');
    const engagementService = new EngagementService();
    const viewModel = await engagementService.getEngagementViewModel(engagementId, req.user!.tenantId);
    
    if (!viewModel) {
      return res.status(404).json({ message: 'Oppdrag eller klient ikke funnet' });
    }

    const { generateEngagementPDF } = await import('./utils/pdf-generator');
    const doc = generateEngagementPDF(viewModel.pdfModel);
    
    // Use company name for filename
    const companyFileName = client.name?.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_') || 'oppdragsavtale';
    
    // Generate PDF buffer
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
    
    res.setHeader('Content-Type', 'application/pdf');
    
    // Configurable Content-Disposition based on query parameter
    if (disposition === 'inline') {
      res.setHeader('Content-Disposition', `inline; filename="${companyFileName}_oppdragsavtale.pdf"`);
    } else {
      res.setHeader('Content-Disposition', `attachment; filename="${companyFileName}_oppdragsavtale.pdf"`);
    }
    
    res.send(pdfBuffer);
    
  } catch (error: any) {
    console.error('❌ Error generating PDF:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate PDF',
      error: error.message
    });
  }
});

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // Serve the built frontend
  const distPath = path.resolve(process.cwd(), "dist/public");

  // Check if the build exists
  if (require('fs').existsSync(distPath)) {
    app.use(express.static(distPath));
    
    // Serve React app for all remaining routes
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
    
    console.log('Serving production build from:', distPath);
  } else {
    console.log('Production build not found. Expected at:', distPath);
    console.log('Starting development server with Vite...');
    
    // Development mode - serve static files from client directory
    console.log('Serving static files from client/ directory...');
    
    // Serve static files from client directory
    app.use(express.static(path.resolve(process.cwd(), 'client')));
    
    // Serve modules with correct MIME types
    app.use('/src', express.static(path.resolve(process.cwd(), 'client/src'), {
      setHeaders: (res, path) => {
        if (path.endsWith('.tsx') || path.endsWith('.ts')) {
          res.setHeader('Content-Type', 'application/javascript');
        }
      }
    }));
    
    // Serve shared modules
    app.use('/shared', express.static(path.resolve(process.cwd(), 'shared'), {
      setHeaders: (res, path) => {
        if (path.endsWith('.ts')) {
          res.setHeader('Content-Type', 'application/javascript');
        }
      }
    }));
    
    // Serve attached assets
    app.use('/attached_assets', express.static(path.resolve(process.cwd(), 'attached_assets')));
    
    // Fallback to index.html for React routing
    app.get('*', (req, res) => {
      const htmlPath = path.resolve(process.cwd(), 'client', 'index.html');
      res.sendFile(htmlPath);
    });
  }

  const PORT = 5000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`RegnskapsAI serving on port ${PORT}`);
  });
})();