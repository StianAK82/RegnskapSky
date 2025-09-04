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
      
      // Generate comprehensive PDF using jsPDF
      const { jsPDF } = require('jspdf');
      const doc = new jsPDF();
      let yPos = 20;
      
      // Main header - centered and bold
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      const headerText = 'OPPDRAGSAVTALE';
      const headerWidth = doc.getTextWidth(headerText);
      const pageWidth = doc.internal.pageSize.getWidth();
      doc.text(headerText, (pageWidth - headerWidth) / 2, yPos);
      
      // Underline the header
      const underlineY = yPos + 2;
      doc.line((pageWidth - headerWidth) / 2, underlineY, (pageWidth - headerWidth) / 2 + headerWidth, underlineY);
      yPos += 25;
      
      // Add content table
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('INNHOLDSFORTEGNELSE', 20, yPos);
      doc.line(20, yPos + 2, 20 + doc.getTextWidth('INNHOLDSFORTEGNELSE'), yPos + 2);
      yPos += 15;
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      const tableOfContents = [
        '1. Klientinformasjon .................................................. 2',
        '2. System og teknisk informasjon .................................. 2', 
        '3. Representanter og signatarer .................................... 2',
        '4. Arbeidsområder og omfang ........................................ 3',
        '5. Honorar og betalingsbetingelser ................................. 3',
        '6. Databehandleravtale (DPA) ....................................... 4',
        '7. Leveransevilkår for regnskapsoppdrag ............................ 5'
      ];
      
      tableOfContents.forEach(line => {
        doc.text(line, 25, yPos);
        yPos += 6;
      });
      
      yPos += 10;
      
      // Client information
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('1. KLIENTINFORMASJON', 20, yPos);
      doc.line(20, yPos + 2, 20 + doc.getTextWidth('1. KLIENTINFORMASJON'), yPos + 2);
      yPos += 12;
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      
      // Create a table for client info
      const clientInfo = [
        ['Firma:', client?.name || 'N/A'],
        ['Organisasjonsnummer:', client?.orgNumber || 'N/A'],
        ['Adresse:', client?.address || 'N/A'],
        ['Kontaktperson:', client?.contactPerson || 'N/A'],
        ['E-post:', client?.email || 'N/A'],
        ['Telefon:', client?.phone || 'N/A']
      ];
      
      clientInfo.forEach(([label, value]) => {
        doc.setFont('helvetica', 'bold');
        doc.text(label, 25, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text(value, 80, yPos);
        yPos += 8;
      });
      yPos += 10;

      // System information 
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('2. SYSTEM OG TEKNISK INFORMASJON', 20, yPos);
      doc.line(20, yPos + 2, 20 + doc.getTextWidth('2. SYSTEM OG TEKNISK INFORMASJON'), yPos + 2);
      yPos += 12;
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      
      const systemInfo = [
        ['Regnskapssystem:', engagement.systemName || 'N/A'],
        ['Lisensholder:', engagement.licenseHolder === 'client' ? 'Klient' : 'Regnskapsfirma'],
        ['Admin-tilgang:', engagement.adminAccess ? 'Ja' : 'Nei'],
        ['Opprettet:', new Date(engagement.createdAt).toLocaleDateString('nb-NO')]
      ];
      
      systemInfo.forEach(([label, value]) => {
        doc.setFont('helvetica', 'bold');
        doc.text(label, 25, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text(value, 80, yPos);
        yPos += 8;
      });
      yPos += 10;
      
      // Signatories
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('3. REPRESENTANTER OG SIGNATARER', 20, yPos);
      doc.line(20, yPos + 2, 20 + doc.getTextWidth('3. REPRESENTANTER OG SIGNATARER'), yPos + 2);
      yPos += 12;
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      
      if (engagement.signatories && Array.isArray(engagement.signatories)) {
        // Table header
        doc.setFont('helvetica', 'bold');
        doc.text('Navn', 25, yPos);
        doc.text('Rolle', 80, yPos);
        doc.text('E-post', 130, yPos);
        doc.line(25, yPos + 2, 180, yPos + 2);
        yPos += 10;
        
        doc.setFont('helvetica', 'normal');
        const roleMap = {
          'client_representative': 'Klientrepresentant',
          'responsible_accountant': 'Oppdragsansvarlig regnskapsfører', 
          'managing_director': 'Daglig leder'
        };
        
        engagement.signatories.forEach((sig: any) => {
          doc.text(sig.name || 'N/A', 25, yPos);
          doc.text(roleMap[sig.role] || sig.role || 'N/A', 80, yPos);
          doc.text(sig.email || 'N/A', 130, yPos);
          yPos += 8;
          if (sig.phone) {
            doc.setFont('helvetica', 'italic');
            doc.text(`Tel: ${sig.phone}`, 130, yPos);
            doc.setFont('helvetica', 'normal');
            yPos += 6;
          }
          yPos += 3;
        });
      }
      yPos += 10;
      
      // Work scopes
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('4. ARBEIDSOMRÅDER OG OMFANG', 20, yPos);
      doc.line(20, yPos + 2, 20 + doc.getTextWidth('4. ARBEIDSOMRÅDER OG OMFANG'), yPos + 2);
      yPos += 12;
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      
      if (engagement.scopes && Array.isArray(engagement.scopes)) {
        // Table header
        doc.setFont('helvetica', 'bold');
        doc.text('Arbeidsområde', 25, yPos);
        doc.text('Frekvens', 100, yPos);
        doc.text('Beskrivelse', 140, yPos);
        doc.line(25, yPos + 2, 190, yPos + 2);
        yPos += 10;
        
        doc.setFont('helvetica', 'normal');
        const scopeMap = {
          'bookkeeping': 'Bokføring',
          'year_end': 'Årsoppgjør', 
          'payroll': 'Lønn',
          'mva': 'MVA',
          'invoicing': 'Fakturering',
          'period_reports': 'Perioderapporter',
          'project': 'Prosjekt',
          'other': 'Annet'
        };
        
        engagement.scopes.forEach((scope: any) => {
          const scopeName = scopeMap[scope.scopeKey] || scope.scopeKey;
          doc.text(scopeName, 25, yPos);
          doc.text(scope.frequency || 'N/A', 100, yPos);
          
          // Handle long descriptions by wrapping text
          if (scope.comments) {
            const maxWidth = 50;
            const words = scope.comments.split(' ');
            let line = '';
            let lineY = yPos;
            
            words.forEach((word: string) => {
              const testLine = line + word + ' ';
              if (doc.getTextWidth(testLine) > maxWidth && line !== '') {
                doc.text(line.trim(), 140, lineY);
                line = word + ' ';
                lineY += 6;
              } else {
                line = testLine;
              }
            });
            if (line.trim()) {
              doc.text(line.trim(), 140, lineY);
            }
          } else {
            doc.text('N/A', 140, yPos);
          }
          yPos += 12;
        });
      }
      yPos += 10;
      
      // Pricing
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('5. HONORAR OG BETALINGSBETINGELSER', 20, yPos);
      doc.line(20, yPos + 2, 20 + doc.getTextWidth('5. HONORAR OG BETALINGSBETINGELSER'), yPos + 2);
      yPos += 12;
      
      doc.setFontSize(11);
      if (engagement.pricing && Array.isArray(engagement.pricing)) {
        engagement.pricing.forEach((price: any, index: number) => {
          const areaMap = {
            'bookkeeping': 'Bokføring',
            'year_end': 'Årsoppgjør',
            'payroll': 'Lønn', 
            'mva': 'MVA',
            'invoicing': 'Fakturering',
            'period_reports': 'Perioderapporter',
            'project': 'Prosjekt',
            'other': 'Annet'
          };
          
          // Create pricing table format
          doc.text(areaMap[price.area] || price.area, 25, yPos);
          yPos += 7;
          
          if (price.model === 'hourly') {
            doc.text(`   Timepris: ${price.hourlyRateExVat || 0} kr (eks. mva)`, 25, yPos);
            yPos += 7;
            doc.text(`   Minimum tid: ${price.minTimeUnitMinutes || 15} minutter`, 25, yPos);
            yPos += 7;
            doc.text(`   Hastetilag: ${price.rushMarkupPercent || 50}%`, 25, yPos);
            yPos += 7;
          } else if (price.model === 'fixed') {
            doc.text(`   Fastpris: ${price.fixedAmountExVat || 0} kr (eks. mva)`, 25, yPos);
            yPos += 7;
            doc.text(`   Periode: ${price.fixedPeriod || 'N/A'}`, 25, yPos);
            yPos += 7;
          } else if (price.model === 'volume') {
            doc.text(`   Volumbasert: ${price.volumeUnitPriceExVat || 0} kr per ${price.volumeUnitLabel || 'enhet'}`, 25, yPos);
            yPos += 7;
          }
          yPos += 5;
        });
      }
      
      // Standard payment terms
      doc.text('Betalingsfrist: 14 dager', 20, yPos);
      yPos += 7;
      doc.text('Fakturafrekvens: Månedlig', 20, yPos);
      yPos += 7;
      doc.text('Forsinkelsesrente: Etter forsinkelsesrenteloven', 20, yPos);
      yPos += 15;
      
      // DPA Information
      if (engagement.dpas && Array.isArray(engagement.dpas) && engagement.dpas.length > 0) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('6. DATABEHANDLERAVTALE (DPA)', 20, yPos);
        doc.line(20, yPos + 2, 20 + doc.getTextWidth('6. DATABEHANDLERAVTALE (DPA)'), yPos + 2);
        yPos += 10;
        
        doc.setFontSize(11);
        engagement.dpas.forEach((dpa: any, index: number) => {
          doc.text(`${index + 1}. Databehandler: ${dpa.processorName}`, 20, yPos);
          yPos += 7;
          doc.text(`   Land: ${dpa.country}`, 25, yPos);
          yPos += 7;
          doc.text(`   Overføringsgrunnlag: ${dpa.transferBasis}`, 25, yPos);
          yPos += 10;
        });
      }
      
      // Add new page for legal terms
      doc.addPage();
      yPos = 20;
      
      // Legal terms header
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('7. LEVERANSEVILKÅR FOR REGNSKAPSOPPDRAG', 20, yPos);
      doc.line(20, yPos + 2, 20 + doc.getTextWidth('7. LEVERANSEVILKÅR FOR REGNSKAPSOPPDRAG'), yPos + 2);
      yPos += 15;
      
      // Legal terms content (without "Regnskap Norge" references)
      doc.setFontSize(11);
      const legalTerms = [
        '1. PARTENES PLIKTER',
        '',
        '1.1 OPPDRAGETS INNHOLD',
        'Regnskapsforetaket skal levere de tjenester som er regulert i oppdragsavtalen.',
        '',
        '1.2 REGNSKAPSFORETAKETS PLIKTER',
        'Regnskapsforetaket skal utføre de tjenester som følger av oppdragsavtalen i samsvar',
        'med gjeldende lovgivning og god regnskapsføringsskikk (GRFS).',
        'Henvendelser fra Kunden skal besvares snarest mulig.',
        '',
        '1.3 KUNDENS PLIKTER',
        'Kunden skal lojalt medvirke til at Regnskapsforetaket får gjennomført oppdraget.',
        'Regnskapsmateriale som leveres til Regnskapsforetaket skal være fullstendig og',
        'relatere seg til virksomheten.',
        '',
        'Dersom det ikke klart fremgår av regnskapsmaterialet hvordan det skal behandles,',
        'skal Kunden uoppfordret gi nødvendig tilleggsinformasjon.',
        '',
        'Kunden skal både før og under oppdraget informere Regnskapsforetaket om alle',
        'relevante forhold, herunder varsler og informasjon fra det offentlige som kan ha',
        'betydning for oppdraget.',
        '',
        '1.4 KOMMUNIKASJON OG DOKUMENTASJON',
        'Alle henvendelser skal rettes til partenes utpekte representanter jf. oppdragsavtalen',
        'pkt. 4, eller medarbeidere som disse har utpekt, via den kommunikasjonsmåte som',
        'er avtalt.',
        '',
        '1.5 TAUSHETSPLIKT',
        'Regnskapsforetakets taushetsplikt følger av regnskapsførerloven.',
        'Partene skal behandle informasjon som de blir kjent med ifm. oppdraget konfidensielt.',
        '',
        '2. FULLMAKT TIL REGNSKAPSFORETAKET',
        'Oppdragsansvarlig og daglig leder gis fullmakt til å innhente:',
        '• Regnskapsopplysninger fra relevante tredjeparter',
        '• Relevante opplysninger for utfylling av offentlige oppgaver',
        '• Fylle ut og sende inn offentlige oppgaver via Altinn',
        '',
        '3. EIENDOMSRETT',
        'Kunden har eiendomsrett til eget innlevert materiale og ferdigstilt regnskapsmateriale',
        'som Regnskapsforetaket har utarbeidet for Kunden.',
        '',
        '4. MISLIGHOLD',
        'Det foreligger mislighold dersom en av partene ikke oppfyller sine plikter etter',
        'avtalen og dette ikke skyldes forhold som den annen part er ansvarlig for.',
        '',
        '5. ANSVARSBEGRENSNING',
        'Regnskapsforetaket er ikke ansvarlig for forhold utenfor Regnskapsforetakets kontroll.',
        'Ved mindre enn grov uaktsomhet eller forsett, er Regnskapsforetakets samlede',
        'økonomiske ansvar begrenset til 10 ganger årlig regnskapshonorar, oppad begrenset',
        'til 1 MNOK.',
        '',
        '6. FORSIKRING',
        'Regnskapsforetaket skal ha profesjonsansvarsforsikring som dekker det avtalte',
        'regnskapsoppdraget.',
        '',
        '7. OPPSIGELSE',
        'Partene kan si opp avtalen med tre måneders skriftlig varsel, regnet fra den første',
        'dagen i måneden etter meddelelsen.',
        '',
        '8. VERNETING',
        'Partenes rettigheter og plikter etter denne avtalen bestemmes i sin helhet av norsk rett.',
        'Regnskapsforetakets hjemting er avtalt verneting for alle tvister mellom',
        'Regnskapsforetaket og Kunden.'
      ];
      
      legalTerms.forEach(line => {
        if (yPos > 270) { // Add new page if needed
          doc.addPage();
          yPos = 20;
        }
        doc.text(line, 20, yPos);
        yPos += line === '' ? 3 : 5;
      });
      
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