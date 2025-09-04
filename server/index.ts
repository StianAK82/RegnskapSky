import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { TaskSchedulerService } from "./services/task-scheduler";
import { authenticateToken } from "./auth";
import { storage } from "./storage";
import path from "path";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      console.log(logLine);
    }
  });

  next();
});


(async () => {
  const server = await registerRoutes(app);
  
  // Add engagement creation endpoint with database storage
  app.post("/api/clients/:clientId/engagements", authenticateToken as any, async (req, res) => {
    try {
      console.log('🔗 POST /api/clients/:clientId/engagements - Creating engagement');
      console.log('📋 Request body:', JSON.stringify(req.body, null, 2));
      
      const { clientId } = req.params;
      const user = req.user as any;
      const engagementData = req.body;
      
      // Generate engagement ID
      const engagementId = `eng-${Date.now()}`;
      
      // Create engagement object for database
      const newEngagement = {
        id: engagementId,
        clientId,
        tenantId: user.tenantId,
        systemName: engagementData.systemName || 'Ukjent system',
        licenseHolder: engagementData.licenseHolder || '',
        adminAccess: engagementData.adminAccess || false,
        signatories: engagementData.signatories || [],
        scopes: engagementData.scopes || [],
        pricing: engagementData.pricing || [],
        dpas: engagementData.dpas || [],
        status: engagementData.status || 'draft',
        validFrom: new Date(engagementData.validFrom || new Date()),
        includeStandardTerms: engagementData.includeStandardTerms || true,
        includeDpa: engagementData.includeDpa || true,
        includeItBilag: engagementData.includeItBilag || true,
        version: engagementData.version || 1
      };
      
      // Store in database
      const createdEngagement = await storage.createEngagement(newEngagement);
      
      console.log('✅ Engagement created and stored in database:', engagementId);
      
      res.json({ 
        message: 'Oppdragsavtale opprettet', 
        engagementId: createdEngagement.id,
        status: 'success' 
      });
      
    } catch (error: any) {
      console.error('❌ Error creating engagement:', error);
      res.status(500).json({ message: `Feil ved opprettelse av oppdragsavtale: ${error.message}` });
    }
  });

  // Add GET endpoint for fetching engagements from database
  app.get("/api/clients/:clientId/engagements", authenticateToken as any, async (req, res) => {
    try {
      console.log('🔍 GET /api/clients/:clientId/engagements - Fetching engagements');
      
      const { clientId } = req.params;
      
      // Fetch engagements from database
      const clientEngagements = await storage.getEngagementsByClient(clientId);
      
      // Transform for frontend compatibility
      const transformedEngagements = clientEngagements.map(e => ({
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

  // Add PDF download endpoint using database storage
  app.get("/api/clients/:clientId/engagements/:engagementId/pdf", (req, res, next) => {
    authenticateToken(req as any, res, next);
  }, async (req, res) => {
    try {
      
      const { clientId, engagementId } = req.params;
      
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
      
      // Generate comprehensive PDF content with company information
      const pdfContent = `
OPPDRAGSAVTALE
===============

KLIENTINFORMASJON
-----------------
Selskap: ${client.name}
Organisasjonsnummer: ${client.orgNumber || 'Ikke oppgitt'}
E-post: ${client.email || 'Ikke oppgitt'}
Telefon: ${client.phone || 'Ikke oppgitt'}

AVTALEDETALJER  
--------------
Avtale ID: ${engagement.id}
System: ${engagement.systemName}
Lisensholder: ${engagement.licenseHolder || 'Ikke oppgitt'}
Admin-tilgang: ${engagement.adminAccess ? 'Ja' : 'Nei'}
Status: ${engagement.status}
Opprettet: ${new Date(engagement.createdAt).toLocaleDateString('nb-NO')}
Gyldig fra: ${new Date(engagement.validFrom).toLocaleDateString('nb-NO')}

SIGNATARER (${Array.isArray(engagement.signatories) ? engagement.signatories.length : 0})
----------
${Array.isArray(engagement.signatories) ? engagement.signatories.map((sig: any) => `- ${sig.name || 'Ukjent'} (${sig.role || 'Ukjent rolle'})`).join('\n') : 'Ingen signatarer oppgitt'}

ARBEIDSOMRÅDER (${Array.isArray(engagement.scopes) ? engagement.scopes.length : 0})
--------------
${Array.isArray(engagement.scopes) ? engagement.scopes.map((scope: any) => `- ${scope.name || 'Ukjent område'}: ${scope.description || 'Ingen beskrivelse'}`).join('\n') : 'Ingen arbeidsområder oppgitt'}

PRISING
-------
${Array.isArray(engagement.pricing) ? engagement.pricing.map((price: any) => `- ${price.description || 'Ukjent'}: ${price.amount || 0} kr ${price.unit || ''}`).join('\n') : 'Ingen prising oppgitt'}
      `.trim();
      
      // Use company name for filename
      const companyFileName = client.name?.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_') || 'oppdragsavtale';
      
      // Generate actual PDF using jsPDF
      const { jsPDF } = require('jspdf');
      const doc = new jsPDF();
      
      // Add content to PDF with proper formatting
      doc.setFontSize(16);
      doc.text('OPPDRAGSAVTALE', 20, 20);
      
      doc.setFontSize(12);
      doc.text(`Klient: ${client?.name || 'N/A'}`, 20, 40);
      doc.text(`Org.nr: ${client?.orgNumber || 'N/A'}`, 20, 50);
      doc.text(`System: ${engagement.systemName || 'N/A'}`, 20, 60);
      doc.text(`Opprettet: ${new Date(engagement.createdAt).toLocaleDateString('nb-NO')}`, 20, 70);
      
      doc.text('SIGNATARER:', 20, 90);
      let yPos = 100;
      
      if (engagement.signatories && Array.isArray(engagement.signatories)) {
        engagement.signatories.forEach((sig: any, index: number) => {
          doc.text(`${index + 1}. ${sig.name} (${sig.role})`, 20, yPos);
          doc.text(`   Email: ${sig.email}`, 20, yPos + 10);
          if (sig.phone) doc.text(`   Telefon: ${sig.phone}`, 20, yPos + 20);
          yPos += 30;
        });
      }
      
      doc.text('ARBEIDSOMRÅDER:', 20, yPos + 10);
      yPos += 20;
      
      if (engagement.scopes && Array.isArray(engagement.scopes)) {
        engagement.scopes.forEach((scope: any, index: number) => {
          doc.text(`${index + 1}. ${scope.scopeKey} (${scope.frequency})`, 20, yPos);
          if (scope.comments) doc.text(`   ${scope.comments}`, 20, yPos + 10);
          yPos += 20;
        });
      }
      
      doc.text('PRISING:', 20, yPos + 10);
      yPos += 20;
      
      if (engagement.pricing && Array.isArray(engagement.pricing)) {
        engagement.pricing.forEach((price: any, index: number) => {
          doc.text(`${index + 1}. ${price.area}: ${price.model}`, 20, yPos);
          if (price.hourlyRateExVat) doc.text(`   Timesats: ${price.hourlyRateExVat} kr (eks. mva)`, 20, yPos + 10);
          if (price.fixedAmountExVat) doc.text(`   Fastpris: ${price.fixedAmountExVat} kr (eks. mva)`, 20, yPos + 10);
          yPos += 20;
        });
      }
      
      // Generate PDF buffer
      const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${companyFileName}_oppdragsavtale.pdf"`);
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

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    console.log(`RegnskapsAI serving on port ${port}`);
    
    // Start the automatic task scheduler
    const scheduler = TaskSchedulerService.getInstance();
    scheduler.start();
  });
})();