import type { Express } from "express";
import { createServer, type Server } from "http";
import Stripe from "stripe";
import { storage } from "./storage";
import { authenticateToken, requireRole, requireSameTenant, hashPassword, comparePassword, generateToken, type AuthRequest } from "./auth";
import { categorizeDocument, generateAccountingSuggestions, askAccountingQuestion, analyzeDocumentImage } from "./services/openai";
import { sendTaskNotification, sendWelcomeEmail, sendSubscriptionNotification } from "./services/sendgrid";
import { 
  insertUserSchema, insertTenantSchema, insertClientSchema, insertTaskSchema, 
  insertTimeEntrySchema, insertDocumentSchema, insertNotificationSchema, insertIntegrationSchema,
  insertCompanyRegistryDataSchema, insertAmlProviderSchema, insertAmlDocumentSchema,
  insertAccountingIntegrationSchema, insertClientChecklistSchema,
  type User 
} from "@shared/schema";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-07-30.basil",
});

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Authentication routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password, firstName, lastName, tenantName, role = "admin" } = req.body;

      // Check if user exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Bruker eksisterer allerede" });
      }

      // Create tenant first
      const tenant = await storage.createTenant({
        name: tenantName,
        email,
        subscriptionPlan: "basic",
        isActive: true,
      });

      // Create user
      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({
        username: email,
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role,
        tenantId: tenant.id,
        isActive: true,
      });

      // Send welcome email
      await sendWelcomeEmail(user.email, `${user.firstName} ${user.lastName}`, tenant.name);

      const token = generateToken(user);
      res.json({ 
        token, 
        user: { 
          id: user.id, 
          email: user.email, 
          firstName: user.firstName, 
          lastName: user.lastName, 
          role: user.role,
          tenantId: user.tenantId 
        } 
      });
    } catch (error: any) {
      res.status(500).json({ message: "Feil ved registrering: " + error.message });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      const user = await storage.getUserByEmail(email);
      if (!user || !user.isActive) {
        return res.status(401).json({ message: "Ugyldig påloggingsinformasjon" });
      }

      const isValidPassword = await comparePassword(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Ugyldig påloggingsinformasjon" });
      }

      const token = generateToken(user);
      res.json({ 
        token, 
        user: { 
          id: user.id, 
          email: user.email, 
          firstName: user.firstName, 
          lastName: user.lastName, 
          role: user.role,
          tenantId: user.tenantId 
        } 
      });
    } catch (error: any) {
      res.status(500).json({ message: "Feil ved pålogging: " + error.message });
    }
  });

  // Dashboard metrics
  app.get("/api/dashboard/metrics", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const metrics = await storage.getDashboardMetrics(req.user!.tenantId);
      res.json(metrics);
    } catch (error: any) {
      res.status(500).json({ message: "Feil ved henting av metrics: " + error.message });
    }
  });

  // Client management
  app.get("/api/clients", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const clients = await storage.getClientsByTenant(req.user!.tenantId);
      res.json(clients);
    } catch (error: any) {
      res.status(500).json({ message: "Feil ved henting av klienter: " + error.message });
    }
  });

  app.post("/api/clients", authenticateToken, requireRole(["admin", "oppdragsansvarlig"]), async (req: AuthRequest, res) => {
    try {
      const clientData = insertClientSchema.parse({
        ...req.body,
        tenantId: req.user!.tenantId,
      });
      
      const client = await storage.createClient(clientData);
      res.status(201).json(client);
    } catch (error: any) {
      res.status(400).json({ message: "Feil ved opprettelse av klient: " + error.message });
    }
  });

  app.put("/api/clients/:id", authenticateToken, requireRole(["admin", "oppdragsansvarlig"]), async (req: AuthRequest, res) => {
    try {
      const client = await storage.updateClient(req.params.id, req.body);
      res.json(client);
    } catch (error: any) {
      res.status(400).json({ message: "Feil ved oppdatering av klient: " + error.message });
    }
  });

  // Task management
  app.get("/api/tasks", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const tasks = await storage.getTasksByTenant(req.user!.tenantId);
      res.json(tasks);
    } catch (error: any) {
      res.status(500).json({ message: "Feil ved henting av oppgaver: " + error.message });
    }
  });

  app.get("/api/tasks/today", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const tasks = await storage.getTodaysTasks(req.user!.tenantId);
      res.json(tasks);
    } catch (error: any) {
      res.status(500).json({ message: "Feil ved henting av dagens oppgaver: " + error.message });
    }
  });

  app.get("/api/tasks/overdue", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const tasks = await storage.getOverdueTasks(req.user!.tenantId);
      res.json(tasks);
    } catch (error: any) {
      res.status(500).json({ message: "Feil ved henting av forfalte oppgaver: " + error.message });
    }
  });

  app.post("/api/tasks", authenticateToken, requireRole(["admin", "oppdragsansvarlig"]), async (req: AuthRequest, res) => {
    try {
      const taskData = insertTaskSchema.parse({
        ...req.body,
        tenantId: req.user!.tenantId,
      });
      
      const task = await storage.createTask(taskData);
      
      // Send notification if assigned to someone
      if (task.assignedTo && task.dueDate) {
        const assignedUser = await storage.getUser(task.assignedTo);
        if (assignedUser) {
          await sendTaskNotification(assignedUser.email, task.title, task.dueDate);
        }
      }
      
      res.status(201).json(task);
    } catch (error: any) {
      res.status(400).json({ message: "Feil ved opprettelse av oppgave: " + error.message });
    }
  });

  app.put("/api/tasks/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const task = await storage.updateTask(req.params.id, req.body);
      res.json(task);
    } catch (error: any) {
      res.status(400).json({ message: "Feil ved oppdatering av oppgave: " + error.message });
    }
  });

  // Time tracking
  app.get("/api/time-entries", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { startDate, endDate } = req.query;
      const entries = await storage.getTimeEntriesByUser(
        req.user!.id,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );
      res.json(entries);
    } catch (error: any) {
      res.status(500).json({ message: "Feil ved henting av timer: " + error.message });
    }
  });

  app.post("/api/time-entries", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const entryData = insertTimeEntrySchema.parse({
        ...req.body,
        tenantId: req.user!.tenantId,
        userId: req.user!.id,
      });
      
      const entry = await storage.createTimeEntry(entryData);
      res.status(201).json(entry);
    } catch (error: any) {
      res.status(400).json({ message: "Feil ved registrering av timer: " + error.message });
    }
  });

  // Document management
  app.get("/api/documents/client/:clientId", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const documents = await storage.getDocumentsByClient(req.params.clientId);
      res.json(documents);
    } catch (error: any) {
      res.status(500).json({ message: "Feil ved henting av dokumenter: " + error.message });
    }
  });

  app.post("/api/documents", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const documentData = insertDocumentSchema.parse({
        ...req.body,
        tenantId: req.user!.tenantId,
      });
      
      const document = await storage.createDocument(documentData);
      res.status(201).json(document);
    } catch (error: any) {
      res.status(400).json({ message: "Feil ved opprettelse av dokument: " + error.message });
    }
  });

  // AI Assistant routes
  app.post("/api/ai/categorize-document", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { fileName, extractedText } = req.body;
      const categorization = await categorizeDocument(fileName, extractedText);
      res.json(categorization);
    } catch (error: any) {
      res.status(500).json({ message: "Feil ved AI-kategorisering: " + error.message });
    }
  });

  app.post("/api/ai/accounting-suggestions", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { description, amount, documentType } = req.body;
      const suggestions = await generateAccountingSuggestions(description, amount, documentType);
      res.json(suggestions);
    } catch (error: any) {
      res.status(500).json({ message: "Feil ved AI-konteringsforslag: " + error.message });
    }
  });

  app.post("/api/ai/ask", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { question } = req.body;
      const answer = await askAccountingQuestion(question);
      res.json({ answer });
    } catch (error: any) {
      res.status(500).json({ message: "Feil ved AI-spørsmål: " + error.message });
    }
  });

  app.post("/api/ai/analyze-image", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { base64Image } = req.body;
      const analysis = await analyzeDocumentImage(base64Image);
      res.json({ analysis });
    } catch (error: any) {
      res.status(500).json({ message: "Feil ved bildeanalyse: " + error.message });
    }
  });

  // Notifications
  app.get("/api/notifications", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { unreadOnly } = req.query;
      const notifications = await storage.getNotificationsByUser(
        req.user!.id, 
        unreadOnly === 'true'
      );
      res.json(notifications);
    } catch (error: any) {
      res.status(500).json({ message: "Feil ved henting av varsler: " + error.message });
    }
  });

  app.put("/api/notifications/:id/read", authenticateToken, async (req: AuthRequest, res) => {
    try {
      await storage.markNotificationRead(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: "Feil ved marking av varsel: " + error.message });
    }
  });

  // Integrations
  app.get("/api/integrations", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const integrations = await storage.getIntegrationsByTenant(req.user!.tenantId);
      res.json(integrations);
    } catch (error: any) {
      res.status(500).json({ message: "Feil ved henting av integrasjoner: " + error.message });
    }
  });

  // Stripe subscription routes
  app.post('/api/create-subscription', authenticateToken, async (req: AuthRequest, res) => {
    let user = req.user!;

    if (user.stripeSubscriptionId) {
      const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
      res.send({
        subscriptionId: subscription.id,
        clientSecret: (subscription.latest_invoice as any)?.payment_intent?.client_secret,
      });
      return;
    }

    try {
      const customer = await stripe.customers.create({
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
      });

      user = await storage.updateUserStripeInfo(user.id, customer.id);

      const subscription = await stripe.subscriptions.create({
        customer: customer.id,
        items: [{
          price: process.env.STRIPE_PRICE_ID || 'price_1234567890',
        }],
        payment_behavior: 'default_incomplete',
        expand: ['latest_invoice.payment_intent'],
      });

      await storage.updateUserStripeInfo(user.id, customer.id, subscription.id);

      res.send({
        subscriptionId: subscription.id,
        clientSecret: (subscription.latest_invoice as any)?.payment_intent?.client_secret,
      });
    } catch (error: any) {
      return res.status(400).send({ error: { message: error.message } });
    }
  });

  // Tripletex/Fiken API placeholders
  app.get("/api/integrations/tripletex/sync", authenticateToken, requireRole(["admin", "oppdragsansvarlig"]), async (req: AuthRequest, res) => {
    try {
      // Placeholder for Tripletex API integration
      // This would implement real API calls to Tripletex
      const mockData = {
        invoices: 45,
        customers: 23,
        lastSync: new Date().toISOString(),
        status: "success"
      };
      
      await storage.upsertIntegration({
        tenantId: req.user!.tenantId,
        provider: "tripletex",
        isActive: true,
        lastSync: new Date(),
        status: "connected",
        config: { apiKey: "***" }
      });

      res.json(mockData);
    } catch (error: any) {
      res.status(500).json({ message: "Feil ved Tripletex-synkronisering: " + error.message });
    }
  });

  app.get("/api/integrations/fiken/sync", authenticateToken, requireRole(["admin", "oppdragsansvarlig"]), async (req: AuthRequest, res) => {
    try {
      // Placeholder for Fiken API integration
      const mockData = {
        invoices: 32,
        customers: 18,
        lastSync: new Date().toISOString(),
        status: "success"
      };

      await storage.upsertIntegration({
        tenantId: req.user!.tenantId,
        provider: "fiken",
        isActive: true,
        lastSync: new Date(),
        status: "connected",
        config: { apiKey: "***" }
      });

      res.json(mockData);
    } catch (error: any) {
      res.status(500).json({ message: "Feil ved Fiken-synkronisering: " + error.message });
    }
  });

  const requireAuth = authenticateToken;

  // Brønnøysund Registry API endpoints
  app.get("/api/bronnoyund/search", requireAuth, async (req, res) => {
    try {
      const { query } = req.query as { query?: string };
      if (!query) {
        return res.status(400).json({ error: "Query parameter required" });
      }

      const { bronnoyundService } = await import("./services/bronnoyund");
      const results = await bronnoyundService.searchCompanies(query as string);
      res.json(results);
    } catch (error) {
      console.error("Brønnøysund search error:", error);
      res.status(500).json({ error: "Failed to search companies" });
    }
  });

  app.get("/api/bronnoyund/company/:orgNumber", requireAuth, async (req, res) => {
    try {
      const { orgNumber } = req.params;
      const { bronnoyundService } = await import("./services/bronnoyund");
      
      if (!bronnoyundService.validateOrgNumber(orgNumber)) {
        return res.status(400).json({ error: "Invalid organization number" });
      }

      const [companyData, rolesData] = await Promise.all([
        bronnoyundService.getCompanyData(orgNumber),
        bronnoyundService.getCompanyRoles(orgNumber)
      ]);

      if (!companyData) {
        return res.status(404).json({ error: "Company not found" });
      }

      const transformedData = bronnoyundService.transformCompanyData(companyData, rolesData || undefined);
      res.json(transformedData);
    } catch (error) {
      console.error("Brønnøysund company fetch error:", error);
      res.status(500).json({ error: "Failed to fetch company data" });
    }
  });

  app.post("/api/clients/:clientId/registry-data", requireAuth, async (req, res) => {
    try {
      const { clientId } = req.params;
      const user = req.user!;
      
      const insertData = insertCompanyRegistryDataSchema.parse({
        ...req.body,
        clientId,
        tenantId: user.tenantId
      });

      const registryData = await storage.createCompanyRegistryData(insertData);
      res.status(201).json(registryData);
    } catch (error) {
      console.error("Create company registry data error:", error);
      res.status(500).json({ error: "Failed to save company registry data" });
    }
  });

  app.get("/api/clients/:clientId/registry-data", requireAuth, async (req, res) => {
    try {
      const { clientId } = req.params;
      const registryData = await storage.getCompanyRegistryData(clientId);
      
      if (!registryData) {
        return res.status(404).json({ error: "Registry data not found" });
      }

      res.json(registryData);
    } catch (error) {
      console.error("Get company registry data error:", error);
      res.status(500).json({ error: "Failed to fetch company registry data" });
    }
  });

  // AML/KYC API endpoints
  app.get("/api/aml/providers", requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const providers = await storage.getAmlProvidersByTenant(user.tenantId);
      res.json(providers);
    } catch (error) {
      console.error("Get AML providers error:", error);
      res.status(500).json({ error: "Failed to fetch AML providers" });
    }
  });

  app.post("/api/aml/providers", requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const insertData = insertAmlProviderSchema.parse({
        ...req.body,
        tenantId: user.tenantId
      });

      const provider = await storage.createAmlProvider(insertData);
      res.status(201).json(provider);
    } catch (error) {
      console.error("Create AML provider error:", error);
      res.status(500).json({ error: "Failed to create AML provider" });
    }
  });

  app.post("/api/clients/:clientId/aml-check", requireAuth, async (req, res) => {
    try {
      const { clientId } = req.params;
      const user = req.user!;
      const { providerId, checkTypes } = req.body;

      // Get client and provider
      const [client, provider] = await Promise.all([
        storage.getClient(clientId),
        storage.getAmlProvidersByTenant(user.tenantId).then(providers => 
          providers.find(p => p.id === providerId)
        )
      ]);

      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }

      if (!provider) {
        return res.status(404).json({ error: "AML provider not found" });
      }

      // Run AML checks
      const { amlKycService } = await import("./services/aml-kyc");
      const checkResults = await amlKycService.runComprehensiveCheck(client, provider, checkTypes);
      
      // Save check results
      const amlChecks = [];
      for (const { type, result } of checkResults) {
        const checkData = {
          clientId,
          tenantId: user.tenantId,
          providerId,
          checkType: type,
          status: result.status,
          result: result.result,
          confidence: result.confidence,
          findings: result.findings,
          cost: result.cost || 0,
          externalReferenceId: result.externalReferenceId,
          rawResponse: result.rawResponse
        };

        const amlCheck = await storage.createAmlCheck(checkData);
        amlChecks.push(amlCheck);
      }

      // Calculate risk score
      const riskAssessment = amlKycService.calculateRiskScore(checkResults);

      res.json({
        checks: amlChecks,
        riskAssessment
      });
    } catch (error) {
      console.error("AML check error:", error);
      res.status(500).json({ error: "Failed to perform AML check" });
    }
  });

  app.get("/api/clients/:clientId/aml-checks", requireAuth, async (req, res) => {
    try {
      const { clientId } = req.params;
      const checks = await storage.getAmlChecksByClient(clientId);
      res.json(checks);
    } catch (error) {
      console.error("Get AML checks error:", error);
      res.status(500).json({ error: "Failed to fetch AML checks" });
    }
  });

  // Document upload for AML/KYC
  app.post("/api/clients/:clientId/aml-documents", requireAuth, async (req, res) => {
    try {
      const { clientId } = req.params;
      const user = req.user!;
      
      const insertData = insertAmlDocumentSchema.parse({
        ...req.body,
        clientId,
        tenantId: user.tenantId,
        uploadedBy: user.id
      });

      const document = await storage.createAmlDocument(insertData);
      res.status(201).json(document);
    } catch (error) {
      console.error("Create AML document error:", error);
      res.status(500).json({ error: "Failed to upload AML document" });
    }
  });

  app.get("/api/clients/:clientId/aml-documents", requireAuth, async (req, res) => {
    try {
      const { clientId } = req.params;
      const documents = await storage.getAmlDocumentsByClient(clientId);
      res.json(documents);
    } catch (error) {
      console.error("Get AML documents error:", error);
      res.status(500).json({ error: "Failed to fetch AML documents" });
    }
  });

  // Accounting integrations API endpoints
  app.get("/api/accounting/adapters", requireAuth, async (req, res) => {
    try {
      const { accountingAdapterRegistry } = await import("./services/accounting-adapters");
      const adapters = accountingAdapterRegistry.getSupportedSystems();
      res.json(adapters);
    } catch (error) {
      console.error("Get accounting adapters error:", error);
      res.status(500).json({ error: "Failed to fetch accounting adapters" });
    }
  });

  app.get("/api/accounting/integrations", requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const integrations = await storage.getAccountingIntegrationsByTenant(user.tenantId);
      res.json(integrations);
    } catch (error) {
      console.error("Get accounting integrations error:", error);
      res.status(500).json({ error: "Failed to fetch accounting integrations" });
    }
  });

  app.post("/api/accounting/integrations", requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const insertData = insertAccountingIntegrationSchema.parse({
        ...req.body,
        tenantId: user.tenantId
      });

      const integration = await storage.createAccountingIntegration(insertData);
      res.status(201).json(integration);
    } catch (error) {
      console.error("Create accounting integration error:", error);
      res.status(500).json({ error: "Failed to create accounting integration" });
    }
  });

  app.post("/api/accounting/integrations/:id/test", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const integration = await storage.getAccountingIntegration(id);
      
      if (!integration) {
        return res.status(404).json({ error: "Integration not found" });
      }

      const { accountingAdapterRegistry } = await import("./services/accounting-adapters");
      const adapter = accountingAdapterRegistry.getAdapter(integration.systemType);
      
      if (!adapter) {
        return res.status(400).json({ error: "Adapter not found" });
      }

      const isConnected = await adapter.testConnection(integration.configuration);
      res.json({ connected: isConnected });
    } catch (error) {
      console.error("Test accounting integration error:", error);
      res.status(500).json({ error: "Failed to test integration" });
    }
  });

  app.post("/api/accounting/integrations/:id/sync", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { syncSettings } = req.body;
      
      const integration = await storage.getAccountingIntegration(id);
      
      if (!integration) {
        return res.status(404).json({ error: "Integration not found" });
      }

      const { accountingAdapterRegistry } = await import("./services/accounting-adapters");
      const adapter = accountingAdapterRegistry.getAdapter(integration.systemType);
      
      if (!adapter) {
        return res.status(400).json({ error: "Adapter not found" });
      }

      const syncResult = await adapter.syncData(integration.configuration, syncSettings);
      res.json(syncResult);
    } catch (error) {
      console.error("Sync accounting integration error:", error);
      res.status(500).json({ error: "Failed to sync data" });
    }
  });

  // Checklist API endpoints
  app.get("/api/checklists/templates", requireAuth, async (req, res) => {
    try {
      const templates = await storage.getChecklistTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Get checklist templates error:", error);
      res.status(500).json({ error: "Failed to fetch checklist templates" });
    }
  });

  app.get("/api/checklists/templates/:category", requireAuth, async (req, res) => {
    try {
      const { category } = req.params;
      const { regnskapNorgeChecklistService } = await import("./services/regnskap-norge-checklists");
      
      const template = regnskapNorgeChecklistService.getChecklistTemplate(category);
      res.json(template);
    } catch (error) {
      console.error("Get checklist template error:", error);
      res.status(500).json({ error: "Failed to fetch checklist template" });
    }
  });

  app.get("/api/clients/:clientId/checklists", requireAuth, async (req, res) => {
    try {
      const { clientId } = req.params;
      const checklists = await storage.getClientChecklistsByClient(clientId);
      res.json(checklists);
    } catch (error) {
      console.error("Get client checklists error:", error);
      res.status(500).json({ error: "Failed to fetch client checklists" });
    }
  });

  app.post("/api/clients/:clientId/checklists", requireAuth, async (req, res) => {
    try {
      const { clientId } = req.params;
      const user = req.user!;
      
      const insertData = insertClientChecklistSchema.parse({
        ...req.body,
        clientId,
        tenantId: user.tenantId
      });

      const checklist = await storage.createClientChecklist(insertData);
      res.status(201).json(checklist);
    } catch (error) {
      console.error("Create client checklist error:", error);
      res.status(500).json({ error: "Failed to create checklist" });
    }
  });

  app.put("/api/clients/:clientId/checklists/:checklistId", requireAuth, async (req, res) => {
    try {
      const { checklistId } = req.params;
      const updates = req.body;
      
      const checklist = await storage.updateClientChecklist(checklistId, updates);
      res.json(checklist);
    } catch (error) {
      console.error("Update client checklist error:", error);
      res.status(500).json({ error: "Failed to update checklist" });
    }
  });

  // Plugin API endpoints
  app.get("/api/plugins/available", requireAuth, async (req, res) => {
    try {
      const { pluginManagerService } = await import("./services/plugin-manager");
      const plugins = pluginManagerService.getAvailablePlugins();
      res.json(plugins);
    } catch (error) {
      console.error("Get available plugins error:", error);
      res.status(500).json({ error: "Failed to fetch available plugins" });
    }
  });

  app.get("/api/plugins/active", requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const { pluginManagerService } = await import("./services/plugin-manager");
      const plugins = pluginManagerService.getActivePlugins(user.tenantId);
      res.json(plugins);
    } catch (error) {
      console.error("Get active plugins error:", error);
      res.status(500).json({ error: "Failed to fetch active plugins" });
    }
  });

  app.post("/api/plugins/:pluginId/activate", requireAuth, async (req, res) => {
    try {
      const { pluginId } = req.params;
      const { configuration } = req.body;
      const user = req.user!;
      
      const { pluginManagerService } = await import("./services/plugin-manager");
      await pluginManagerService.activatePlugin(pluginId, user.tenantId, configuration);
      
      // Save plugin configuration
      const configData = {
        tenantId: user.tenantId,
        pluginId,
        configuration,
        isActive: true
      };
      
      await storage.createPluginConfiguration(configData);
      res.json({ success: true });
    } catch (error) {
      console.error("Activate plugin error:", error);
      res.status(500).json({ error: "Failed to activate plugin" });
    }
  });

  app.post("/api/plugins/:pluginId/deactivate", requireAuth, async (req, res) => {
    try {
      const { pluginId } = req.params;
      const user = req.user!;
      
      const { pluginManagerService } = await import("./services/plugin-manager");
      await pluginManagerService.deactivatePlugin(pluginId, user.tenantId);
      
      res.json({ success: true });
    } catch (error) {
      console.error("Deactivate plugin error:", error);
      res.status(500).json({ error: "Failed to deactivate plugin" });
    }
  });

  app.post("/api/plugins/:pluginId/execute", requireAuth, async (req, res) => {
    try {
      const { pluginId } = req.params;
      const { action, data } = req.body;
      const user = req.user!;
      
      // Get plugin configuration
      const configs = await storage.getPluginConfigurationsByTenant(user.tenantId);
      const config = configs.find(c => c.pluginId === pluginId && c.isActive);
      
      if (!config) {
        return res.status(404).json({ error: "Plugin not configured or inactive" });
      }
      
      const { pluginManagerService } = await import("./services/plugin-manager");
      const result = await pluginManagerService.executePlugin(
        pluginId, 
        user.tenantId, 
        action, 
        data, 
        config.configuration
      );
      
      res.json(result);
    } catch (error) {
      console.error("Execute plugin error:", error);
      res.status(500).json({ error: "Failed to execute plugin" });
    }
  });

  // Object storage endpoints for document uploads
  app.post("/api/objects/upload", requireAuth, async (req, res) => {
    try {
      const { ObjectStorageService } = await import("./objectStorage");
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Get upload URL error:", error);
      res.status(500).json({ error: "Failed to get upload URL" });
    }
  });

  app.get("/api/objects/:objectPath(*)", requireAuth, async (req, res) => {
    try {
      const { ObjectStorageService } = await import("./objectStorage");
      const objectStorageService = new ObjectStorageService();
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Download object error:", error);
      if (!res.headersSent) {
        res.status(404).json({ error: "File not found" });
      }
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
