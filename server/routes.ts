import type { Express } from "express";
import { createServer, type Server } from "http";
import Stripe from "stripe";
import { storage } from "./storage";
import { authenticateToken, requireRole, requireSameTenant, hashPassword, comparePassword, generateToken, type AuthRequest } from "./auth";
import { categorizeDocument, generateAccountingSuggestions, askAccountingQuestion, analyzeDocumentImage } from "./services/openai";
import { sendTaskNotification, sendWelcomeEmail, sendSubscriptionNotification } from "./services/sendgrid";
import { insertUserSchema, insertTenantSchema, insertClientSchema, insertTaskSchema, insertTimeEntrySchema, insertDocumentSchema } from "@shared/schema";

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

  const httpServer = createServer(app);
  return httpServer;
}
