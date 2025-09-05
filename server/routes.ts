import type { Express } from "express";
import { createServer, type Server } from "http";
import Stripe from "stripe";
import { storage } from "./storage";
import { authenticateToken, requireRole, requireSameTenant, hashPassword, comparePassword, generateToken, type AuthRequest } from "./auth";
import { enforceSeatLimit, checkEmployeeLimit } from "./middleware/enforceSeatLimit";
import { categorizeDocument, generateAccountingSuggestions, askAccountingQuestion, analyzeDocumentImage } from "./services/openai";
import { sendTaskNotification, sendWelcomeEmail, sendSubscriptionNotification } from "./services/sendgrid";
import { bronnoyundService } from "./services/bronnoyund";
import { registerLicensingRoutes } from "./routes/licensing";
import { LicensingService } from "./services/licensing";
import multer from "multer";
import * as XLSX from "xlsx";
import * as speakeasy from "speakeasy";
import * as qrcode from "qrcode";
import { 
  insertUserSchema, insertTenantSchema, insertClientSchema, insertTaskSchema, 
  insertClientTaskSchema, insertClientResponsibleSchema, insertEmployeeSchema,
  insertTimeEntrySchema, insertDocumentSchema, insertNotificationSchema, insertIntegrationSchema,
  insertCompanyRegistryDataSchema, insertAmlProviderSchema, insertAmlDocumentSchema,
  insertAccountingIntegrationSchema, insertClientChecklistSchema,
  type User, clientTasks, tenants, users
} from "../shared/schema";
import { z } from "zod";

// Additional schemas for client flow
const systemSchema = z.object({
  system: z.string().min(1),
  licenseHolder: z.enum(["client", "firm"]).optional(),
  adminAccess: z.boolean().optional().default(false)
});

const addResponsibleSchema = z.object({
  userId: z.string().uuid(),
  role: z.literal("accounting_responsible").default("accounting_responsible")
});

const tasksSetupSchema = z.object({
  scopes: z.array(z.string()).min(1)
});

const assignResponsibleSchema = z.object({
  userId: z.string().uuid(),
  onlyUnassigned: z.boolean().optional().default(true)
});
import { db } from "./db";
import { eq, and, sql } from "drizzle-orm";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-07-30.basil",
});

// bronnoyundService is imported as default export

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel and CSV files are allowed'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Check if user exists by email
  app.post('/api/auth/check-user', async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: 'E-post er påkrevd' });
      }

      const user = await storage.getUserByEmail(email);
      res.json({ exists: !!user });
    } catch (error) {
      console.error('Error checking user:', error);
      res.status(500).json({ message: 'Kunne ikke sjekke bruker' });
    }
  });

  // Setup 2FA for new or existing user
  app.post('/api/auth/setup-2fa', async (req, res) => {
    try {
      const { email, firstName, lastName, tenantName } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: 'E-post er påkrevd' });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      
      let userEmail = email;
      let isExisting = false;

      if (existingUser) {
        // For existing users, just set up 2FA
        userEmail = existingUser.email;
        isExisting = true;
      } else {
        // For new users, require all fields
        if (!firstName || !lastName || !tenantName) {
          return res.status(400).json({ message: 'Alle felter er påkrevd for nye brukere' });
        }
      }

      // Generate secret for 2FA
      const secret = speakeasy.generateSecret({
        name: `RegnskapsAI (${userEmail})`,
        issuer: 'RegnskapsAI',
        length: 32,
      });

      // Generate QR code
      const qrCodeDataURL = await qrcode.toDataURL(secret.otpauth_url!);

      // Store secret temporarily (in session or temporary storage)
      // For simplicity, we'll include it in response
      
      res.json({
        secret: secret.base32,
        qrCode: qrCodeDataURL,
        email: userEmail,
        firstName: firstName || (existingUser?.firstName),
        lastName: lastName || (existingUser?.lastName),
        tenantName: tenantName,
        isExisting
      });
    } catch (error) {
      console.error('Error setting up 2FA:', error);
      res.status(500).json({ message: 'Kunne ikke sette opp 2FA' });
    }
  });

  // Verify 2FA and create/update user
  app.post('/api/auth/verify-2fa', async (req, res) => {
    try {
      const { email, token, secret, firstName, lastName, tenantName, isExisting } = req.body;
      
      if (!email || !token || !secret) {
        return res.status(400).json({ message: 'E-post, token og secret er påkrevd' });
      }

      // Verify the token against the secret
      const isValid = speakeasy.totp.verify({
        secret: secret,
        encoding: 'base32',
        token: token,
        window: 2
      });

      if (!isValid) {
        return res.status(400).json({ message: 'Ugyldig kode' });
      }

      // Generate backup codes
      const backupCodes = Array.from({ length: 8 }, () => 
        Math.random().toString(36).substring(2, 8).toUpperCase()
      );

      if (isExisting) {
        // Update existing user with 2FA
        const existingUser = await storage.getUserByEmail(email);
        if (existingUser) {
          await storage.updateUser2FA(existingUser.id, secret, backupCodes);
        }
      } else {
        // Create new user with 2FA
        if (!firstName || !lastName || !tenantName) {
          return res.status(400).json({ message: 'Alle felter er påkrevd for nye brukere' });
        }

        // Create tenant first
        const tenant = await storage.createTenant({
          name: tenantName,
          email: email,
          isActive: true
        });

        // Create user
        await storage.createUser({
          email: email,
          username: email,
          firstName: firstName,
          lastName: lastName,
          role: 'admin',
          tenantId: tenant.id,
          twoFactorSecret: secret,
          twoFactorEnabled: true,
          twoFactorBackupCodes: backupCodes,
          isActive: true
        });
      }

      res.json({
        message: '2FA verifisert og aktivert',
        backupCodes
      });
    } catch (error) {
      console.error('Error verifying 2FA:', error);
      res.status(500).json({ message: 'Kunne ikke verifisere 2FA' });
    }
  });

  // Get current user info
  app.get('/api/auth/me', authenticateToken as any, async (req: AuthRequest, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user) {
        return res.status(404).json({ message: 'Bruker ikke funnet' });
      }

      res.json({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        tenantId: user.tenantId
      });
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ message: 'Kunne ikke hente brukerdata' });
    }
  });

  // Login with 2FA
  app.post('/api/auth/login-2fa', async (req, res) => {
    try {
      const { email, token, backupCode } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: 'E-post er påkrevd' });
      }

      if (!token && !backupCode) {
        return res.status(400).json({ message: 'Token eller backup-kode er påkrevd' });
      }

      // Find user
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ message: 'Bruker ikke funnet' });
      }

      // Verify 2FA token or backup code
      let isValid = false;

      if (token && user.twoFactorSecret) {
        isValid = speakeasy.totp.verify({
          secret: user.twoFactorSecret,
          encoding: 'base32',
          token: token,
          window: 2
        });
      } else if (backupCode && user.twoFactorBackupCodes) {
        isValid = user.twoFactorBackupCodes.includes(backupCode);
        
        if (isValid) {
          // Remove used backup code
          const updatedBackupCodes = user.twoFactorBackupCodes.filter(code => code !== backupCode);
          await storage.updateUser2FABackupCodes(user.id, updatedBackupCodes);
        }
      }

      if (!isValid) {
        return res.status(401).json({ message: 'Ugyldig kode' });
      }

      // Generate JWT token
      const jwtToken = generateToken(user);

      res.json({
        token: jwtToken,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          tenantId: user.tenantId
        }
      });
    } catch (error) {
      console.error('Error logging in with 2FA:', error);
      res.status(500).json({ message: 'Pålogging feilet' });
    }
  });
  
  // Billing routes for invoicing new customers
  app.get('/api/billing/invoices', authenticateToken as any, async (req, res) => {
    try {
      // For now, return mock invoices - integrate with actual billing system later
      const mockInvoices = [
        {
          id: '1',
          tenantId: req.user!.tenantId,
          customerName: 'Testfirma AS',
          customerEmail: 'test@testfirma.no',
          amount: 799,
          status: 'paid',
          dueDate: new Date().toISOString(),
          invoiceDate: new Date().toISOString(),
          description: 'RegnskapsAI - Månedlig abonnement',
          items: []
        }
      ];
      res.json(mockInvoices);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      res.status(500).json({ error: 'Failed to fetch invoices' });
    }
  });

  app.post('/api/billing/invoices', authenticateToken as any, async (req, res) => {
    try {
      const { customerName, customerEmail, amount, description, dueDate } = req.body;
      
      // Here you would integrate with a billing system like Stripe Billing, 
      // Invoice Ninja, or create your own invoice management
      const newInvoice = {
        id: Date.now().toString(),
        tenantId: req.user!.tenantId,
        customerName,
        customerEmail,
        amount,
        status: 'draft',
        dueDate,
        invoiceDate: new Date().toISOString(),
        description,
        items: []
      };

      // TODO: Send email with invoice using SendGrid
      console.log('Creating invoice for:', customerName, customerEmail, amount);
      
      res.json(newInvoice);
    } catch (error) {
      console.error('Error creating invoice:', error);
      res.status(500).json({ error: 'Failed to create invoice' });
    }
  });

  app.post('/api/billing/invoices/:id/send', authenticateToken as any, async (req, res) => {
    try {
      const { id } = req.params;
      
      // TODO: Send invoice email to customer
      console.log('Sending invoice:', id);
      
      res.json({ message: 'Invoice sent successfully' });
    } catch (error) {
      console.error('Error sending invoice:', error);
      res.status(500).json({ error: 'Failed to send invoice' });
    }
  });

  // Owner dashboard metrics
  app.get('/api/owner/metrics', authenticateToken as any, async (req, res) => {
    try {
      // Check if user is system owner
      const user = req.user!;
      if (user.email !== 'stian@zaldo.no') {
        return res.status(403).json({ error: 'Access denied - owner only' });
      }

      const tenants = await storage.getAllTenants();
      const totalTenants = tenants.length;
      const activeTenants = tenants.filter(t => t.isActive).length;
      
      // Calculate revenue (799 kr per active tenant)
      const monthlyRevenue = activeTenants * 799;
      const totalRevenue = monthlyRevenue; // Simplified for now
      
      // Mock subscription data for now
      const subscriptions = {
        active: activeTenants,
        cancelled: Math.max(0, totalTenants - activeTenants),
        trial: Math.floor(activeTenants * 0.1) // 10% in trial
      };

      // Recent signups (last 10 tenants)
      const recentSignups = tenants
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10)
        .map(tenant => ({
          id: tenant.id,
          companyName: tenant.name,
          email: tenant.contactEmail || 'ikke oppgitt',
          plan: 'Standard - 799 kr/måned',
          status: tenant.isActive ? 'active' : 'trial',
          signupDate: tenant.createdAt,
          revenue: 799
        }));

      const metrics = {
        totalTenants,
        activeTenants,
        totalRevenue,
        monthlyRevenue,
        subscriptions,
        recentSignups
      };

      res.json(metrics);
    } catch (error) {
      console.error('Error fetching owner metrics:', error);
      res.status(500).json({ error: 'Failed to fetch metrics' });
    }
  });

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
  app.get("/api/dashboard/metrics", authenticateToken as any, async (req: AuthRequest, res) => {
    try {
      const metrics = await storage.getDashboardMetrics(req.user!.tenantId);
      res.json(metrics);
    } catch (error: any) {
      res.status(500).json({ message: "Feil ved henting av metrics: " + error.message });
    }
  });

  // Client task overview
  app.get("/api/clients/task-overview", authenticateToken as any, async (req: AuthRequest, res) => {
    try {
      const clientsOverview = await storage.getClientsWithTaskOverview(req.user!.tenantId);
      res.json(clientsOverview);
    } catch (error: any) {
      res.status(500).json({ message: "Feil ved henting av klientoppgaveoversikt: " + error.message });
    }
  });

  // Client management
  app.get("/api/clients", authenticateToken as any, async (req: AuthRequest, res) => {
    try {
      const { include } = req.query;
      const clients = await storage.getClientsByTenant(req.user!.tenantId);
      
      if (include === 'summary') {
        // Get task summaries for each client
        const clientsWithSummary = await Promise.all(
          clients.map(async (client) => {
            const taskInstances = await storage.getTaskInstancesByClient(client.id);
            const openTasks = taskInstances.filter(task => task.status === 'open').length;
            const overdueTasks = taskInstances.filter(task => 
              task.status !== 'done' && task.dueAt && new Date(task.dueAt) < new Date()
            ).length;
            
            // Get engagement owner info
            const engagementOwner = client.engagementOwnerId ? 
              await storage.getUser(client.engagementOwnerId) : null;
            
            // Get recurring tasks and check which are due this month
            const recurringTasks = client.recurringTasks ? 
              (Array.isArray(client.recurringTasks) ? client.recurringTasks : [client.recurringTasks]).map((task: any) => {
                const currentMonth = new Date().getMonth();
                let dueThisMonth = false;

                // Check if task is due this month based on frequency
                if (task.frequency) {
                  const freq = task.frequency.toLowerCase();
                  if (freq.includes('månedlig') || freq.includes('monthly')) {
                    dueThisMonth = true;
                  } else if (freq.includes('kvartalsvis') || freq.includes('quarterly')) {
                    dueThisMonth = [0, 3, 6, 9].includes(currentMonth); // Q1, Q2, Q3, Q4
                  } else if (freq.includes('årlig') || freq.includes('yearly')) {
                    dueThisMonth = currentMonth === 11; // December
                  } else if (freq.includes('ukentlig') || freq.includes('weekly') || freq.includes('daglig') || freq.includes('daily')) {
                    dueThisMonth = true;
                  }
                }

                return {
                  taskName: task.taskName || task.task || 'Ukjent oppgave',
                  frequency: task.frequency || 'Ikke spesifisert',
                  dueThisMonth
                };
              }) : [];

            return {
              ...client,
              openTasksCount: openTasks,
              overdueTasksCount: overdueTasks,
              recurringTasks,
              accountingSystem: client.accountingSystem,
              accountingSystemUrl: client.accountingSystemUrl,
              engagementOwner: engagementOwner ? {
                id: engagementOwner.id,
                firstName: engagementOwner.firstName,
                lastName: engagementOwner.lastName
              } : null
            };
          })
        );
        res.json(clientsWithSummary);
      } else {
        res.json(clients);
      }
    } catch (error: any) {
      res.status(500).json({ message: "Feil ved henting av klienter: " + error.message });
    }
  });

  app.post("/api/clients", authenticateToken as any, requireRole(["admin", "oppdragsansvarlig"]) as any, async (req: AuthRequest, res) => {
    try {
      // Validate client data
      const clientData = insertClientSchema.parse({
        ...req.body,
        tenantId: req.user!.tenantId,
      });

      // Ensure companyName is set (from name field)
      if (!clientData.name) {
        return res.status(400).json({ message: "Firmanavn er påkrevd" });
      }

      // Validate responsible person ID if provided
      if (clientData.responsiblePersonId) {
        const employee = await storage.getEmployee(clientData.responsiblePersonId);
        if (!employee || employee.tenantId !== req.user!.tenantId) {
          return res.status(400).json({ message: "Ugyldig ansvarlig person ID" });
        }
      }
      
      const client = await storage.createClient(clientData);
      
      // Create default standard tasks for the new client with specific dates
      const currentYear = new Date().getFullYear();
      const defaultTasks = [
        { 
          name: "Aksjonærregisteroppgave", 
          interval: "specific_date", 
          dueDate: new Date(currentYear, 11, 1) // December 1st current year
        },
        { 
          name: "Skattemelding", 
          interval: "specific_date", 
          dueDate: new Date(currentYear + 1, 4, 31) // May 31st next year
        },
        { 
          name: "Årsoppgjør", 
          interval: "specific_date", 
          dueDate: new Date(currentYear + 1, 6, 31) // July 31st next year
        }
      ];
      
      for (const task of defaultTasks) {
        await storage.createClientTask({
          clientId: client.id,
          tenantId: client.tenantId,
          taskName: task.name,
          taskType: "standard",
          description: `Standard oppgave: ${task.name}`,
          interval: "yearly" as any,
          repeatInterval: null,
          dueDate: task.dueDate.toISOString(),
          status: "ikke_startet",
          assignedTo: null
        });
      }
      
      res.status(201).json(client);
    } catch (error: any) {
      console.error('Client creation error:', error);
      res.status(400).json({ message: "Feil ved opprettelse av klient: " + error.message });
    }
  });

  app.get("/api/clients/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const client = await storage.getClient(req.params.id);
      if (!client) {
        return res.status(404).json({ message: "Klient ikke funnet" });
      }
      
      // Ensure tenant security - client must belong to user's tenant
      if (client.tenantId !== req.user!.tenantId) {
        return res.status(404).json({ message: "Klient ikke funnet" });
      }
      
      res.json(client);
    } catch (error: any) {
      console.error('Error fetching client by ID:', error);
      res.status(500).json({ message: "Feil ved henting av klient: " + error.message });
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

  // PATCH endpoint for updating client engagement settings
  app.patch("/api/clients/:id", authenticateToken, requireRole(["admin", "oppdragsansvarlig"]), async (req: AuthRequest, res) => {
    try {
      const clientId = req.params.id;
      
      // Validate client belongs to tenant
      const existingClient = await storage.getClient(clientId);
      if (!existingClient || existingClient.tenantId !== req.user!.tenantId) {
        return res.status(404).json({ message: "Klient ikke funnet" });
      }

      // Validate engagement owner if provided
      if (req.body.engagementOwnerId) {
        const user = await storage.getUser(req.body.engagementOwnerId);
        if (!user || user.tenantId !== req.user!.tenantId) {
          return res.status(400).json({ message: "Ugyldig oppdragsansvarlig" });
        }
      }

      // Validate payroll day
      if (req.body.payrollRunDay && (req.body.payrollRunDay < 1 || req.body.payrollRunDay > 31)) {
        return res.status(400).json({ message: "Lønnskjøringsdag må være mellom 1 og 31" });
      }

      // Generate payroll task if payrollRunDay is set
      if (req.body.payrollRunDay && req.body.payrollRunDay !== existingClient.payrollRunDay) {
        await storage.generatePayrollTask(clientId, req.body.payrollRunDay, req.body.payrollRunTime);
      }

      const client = await storage.updateClient(clientId, req.body);
      res.json(client);
    } catch (error: any) {
      res.status(400).json({ message: "Feil ved oppdatering av klient: " + error.message });
    }
  });

  // Get tasks for a specific client
  app.get("/api/clients/:id/tasks", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const clientId = req.params.id;
      console.log(`[REQ] GET /api/clients/${clientId}/tasks - tenantId: ${req.user!.tenantId}`);
      
      // First try to get client tasks directly (more lenient)
      const tasks = await storage.getClientTasksByClient(clientId, req.user!.tenantId);
      console.log(`[REQ] Found ${tasks.length} tasks for client ${clientId}`);
      
      // If we have tasks, return them
      if (tasks && tasks.length > 0) {
        res.json(tasks);
        return;
      }
      
      // If no tasks, verify client exists and belongs to tenant
      const client = await storage.getClient(clientId);
      if (!client || client.tenantId !== req.user!.tenantId) {
        console.log(`[REQ] Client ${clientId} not found or access denied - returning empty array`);
        return res.status(200).json([]);
      }

      // Client exists but has no tasks - return empty array
      res.json([]);
    } catch (error: any) {
      console.error(`[REQ] GET /api/clients/${clientId}/tasks error:`, error);
      res.status(500).json({ message: "Feil ved henting av oppgaver: " + error.message });
    }
  });

  // Excel template download
  app.get("/api/clients/excel-template", authenticateToken, async (req: AuthRequest, res) => {
    try {
      // Create workbook with sample data
      const workbook = XLSX.utils.book_new();
      
      // Define column headers
      const headers = [
        'Navn', 'Organisasjonsnummer', 'E-post', 'Telefon', 
        'Adresse', 'Postnummer', 'Poststed', 'Regnskapssystem'
      ];
      
      // Sample data
      const sampleData = [
        headers,
        [
          'Eksempel AS', '123456789', 'post@eksempel.no', '12345678',
          'Eksempelgate 1', '0123', 'Oslo', 'Fiken'
        ],
        [
          'Test Bedrift AS', '987654321', 'kontakt@test.no', '87654321',
          'Testveien 2', '0456', 'Bergen', 'Tripletex'
        ]
      ];
      
      // Create worksheet
      const worksheet = XLSX.utils.aoa_to_sheet(sampleData);
      
      // Set column widths
      worksheet['!cols'] = [
        { width: 20 }, // Navn
        { width: 15 }, // Organisasjonsnummer
        { width: 25 }, // E-post
        { width: 12 }, // Telefon
        { width: 20 }, // Adresse
        { width: 10 }, // Postnummer
        { width: 15 }, // Poststed
        { width: 15 }  // Regnskapssystem
      ];
      
      // Style the header row
      const headerRange = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:H1');
      for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
        if (!worksheet[cellAddress]) continue;
        worksheet[cellAddress].s = {
          font: { bold: true },
          fill: { fgColor: { rgb: "EFEFEF" } }
        };
      }
      
      XLSX.utils.book_append_sheet(workbook, worksheet, "Klienter");
      
      // Generate Excel buffer
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="klient-import-mal.xlsx"');
      res.send(buffer);
    } catch (error: any) {
      console.error('Error generating Excel template:', error);
      res.status(500).json({ message: "Feil ved generering av Excel-mal: " + error.message });
    }
  });

  // Excel import
  app.post("/api/clients/import-excel", authenticateToken, upload.single('file'), async (req: AuthRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Ingen fil lastet opp" });
      }

      const user = req.user!;
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      if (jsonData.length < 2) {
        return res.status(400).json({ message: "Excel-filen må inneholde minst en rad med data i tillegg til overskrifter" });
      }

      const headers = jsonData[0] as string[];
      const rows = jsonData.slice(1) as any[][];

      // Map column indices
      const columnMap: Record<string, number> = {};
      headers.forEach((header, index) => {
        const normalizedHeader = header.toLowerCase().trim();
        if (normalizedHeader.includes('navn')) columnMap.name = index;
        if (normalizedHeader.includes('organisasjon') || normalizedHeader.includes('orgnr')) columnMap.orgNumber = index;
        if (normalizedHeader.includes('e-post') || normalizedHeader.includes('email')) columnMap.email = index;
        if (normalizedHeader.includes('telefon') || normalizedHeader.includes('phone')) columnMap.phone = index;
        if (normalizedHeader.includes('adresse') || normalizedHeader.includes('address')) columnMap.address = index;
        if (normalizedHeader.includes('postnummer') || normalizedHeader.includes('zip')) columnMap.postalCode = index;
        if (normalizedHeader.includes('poststed') || normalizedHeader.includes('city')) columnMap.city = index;
        if (normalizedHeader.includes('regnskapssystem') || normalizedHeader.includes('accounting')) columnMap.accountingSystem = index;
      });

      // Validate required columns
      const requiredColumns = ['name', 'orgNumber', 'email', 'phone'];
      const missingColumns = requiredColumns.filter(col => columnMap[col] === undefined);
      
      if (missingColumns.length > 0) {
        return res.status(400).json({ 
          message: `Manglende påkrevde kolonner: ${missingColumns.join(', ')}`
        });
      }

      let imported = 0;
      let duplicates = 0;
      const errors: string[] = [];

      // Get existing clients to check for duplicates
      const existingClients = await storage.getClientsByTenant(user.tenantId);
      const existingOrgNumbers = new Set(existingClients.map(c => c.orgNumber).filter(Boolean));

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNumber = i + 2; // +2 because Excel rows are 1-indexed and we skip header

        try {
          // Skip empty rows
          if (!row || row.every(cell => !cell)) continue;

          const clientData = {
            name: row[columnMap.name]?.toString().trim(),
            orgNumber: row[columnMap.orgNumber]?.toString().trim(),
            email: row[columnMap.email]?.toString().trim(),
            phone: row[columnMap.phone]?.toString().trim(),
            address: row[columnMap.address]?.toString().trim() || '',
            postalCode: row[columnMap.postalCode]?.toString().trim() || '',
            city: row[columnMap.city]?.toString().trim() || '',
            accountingSystem: row[columnMap.accountingSystem]?.toString().trim() || 'Annet',
            tenantId: user.tenantId,
            isActive: true
          };

          // Validate required fields
          if (!clientData.name || !clientData.orgNumber || !clientData.email || !clientData.phone) {
            errors.push(`Rad ${rowNumber}: Mangler påkrevde felter`);
            continue;
          }

          // Validate organization number format (9 digits)
          if (!/^\d{9}$/.test(clientData.orgNumber)) {
            errors.push(`Rad ${rowNumber}: Organisasjonsnummer må være 9 siffer`);
            continue;
          }

          // Check for duplicates
          if (existingOrgNumbers.has(clientData.orgNumber)) {
            duplicates++;
            continue;
          }

          // Validate email format
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(clientData.email)) {
            errors.push(`Rad ${rowNumber}: Ugyldig e-postformat`);
            continue;
          }

          // Create client
          await storage.createClient(clientData);
          existingOrgNumbers.add(clientData.orgNumber);
          imported++;

        } catch (error: any) {
          errors.push(`Rad ${rowNumber}: ${error.message}`);
        }
      }

      res.json({
        success: true,
        imported,
        duplicates,
        errors: errors.slice(0, 10) // Limit to first 10 errors
      });

    } catch (error: any) {
      console.error('Error importing Excel file:', error);
      res.status(500).json({ message: "Feil ved import av Excel-fil: " + error.message });
    }
  });

  // Generate upcoming tasks based on templates and payroll settings
  app.post("/api/tasks/generate-upcoming", authenticateToken, requireRole(["admin", "oppdragsansvarlig"]), async (req: AuthRequest, res) => {
    try {
      const { days = 60 } = req.body;
      const generated = await storage.generateUpcomingTasks(req.user!.tenantId, days);
      res.json({ message: `${generated} oppgaver generert for de neste ${days} dagene`, count: generated });
    } catch (error: any) {
      res.status(500).json({ message: "Feil ved generering av oppgaver: " + error.message });
    }
  });

  // Task Scheduler Management
  app.get("/api/tasks/scheduler/status", authenticateToken, requireRole(["admin", "oppdragsansvarlig"]), async (req: AuthRequest, res) => {
    try {
      const { TaskSchedulerService } = await import("./services/task-scheduler");
      const scheduler = TaskSchedulerService.getInstance();
      const status = scheduler.getStatus();
      
      res.json({
        ...status,
        message: status.isRunning ? 'Scheduler kjører' : 'Scheduler er stoppet'
      });
    } catch (error: any) {
      res.status(500).json({ message: "Feil ved henting av scheduler status: " + error.message });
    }
  });

  app.post("/api/tasks/scheduler/trigger", authenticateToken, requireRole(["admin", "oppdragsansvarlig"]), async (req: AuthRequest, res) => {
    try {
      const { TaskSchedulerService } = await import("./services/task-scheduler");
      const scheduler = TaskSchedulerService.getInstance();
      
      // Manually trigger task processing
      await (scheduler as any).processRecurringTasks();
      
      res.json({ 
        success: true, 
        message: "Gjentagende oppgaver prosessert manuelt"
      });
    } catch (error: any) {
      res.status(500).json({ message: "Feil ved manuell kjøring av scheduler: " + error.message });
    }
  });

  // Employee management
  app.get("/api/employees", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const employees = await storage.getEmployeesByTenant(req.user!.tenantId);
      
      // Enrich employees with user license status
      const employeesWithLicense = await Promise.all(
        employees.map(async (employee) => {
          const user = await storage.getUserByEmail(employee.email);
          return {
            ...employee,
            isLicensed: user?.isLicensed || false,
            userId: user?.id
          };
        })
      );
      
      res.json(employeesWithLicense);
    } catch (error: any) {
      res.status(500).json({ message: "Feil ved henting av ansatte: " + error.message });
    }
  });

  app.post("/api/employees", authenticateToken, requireRole(["admin", "oppdragsansvarlig"]), checkEmployeeLimit, async (req: AuthRequest, res) => {
    try {
      const tenantId = req.user!.tenantId;
      const licensingService = new LicensingService();
      
      const employeeData = insertEmployeeSchema.parse({
        ...req.body,
        tenantId,
      });
      
      // Create employee first
      const employee = await storage.createEmployee(employeeData);
      
      // Check if a user already exists for this employee email
      let user = await storage.getUserByEmail(employee.email);
      
      if (!user) {
        // Create a corresponding user account for the employee (if not exists)
        const userData = insertUserSchema.parse({
          username: employee.email,
          email: employee.email,
          firstName: employee.firstName,
          lastName: employee.lastName,
          role: "ansatt", // Default role for employees
          tenantId,
          isLicensed: true, // Default to licensed as per requirements
          isActive: true
        });
        
        user = await storage.createUser(userData);
      } else {
        // Update existing user to be licensed
        await storage.updateUser2FA(user.id, user.twoFactorSecret || '', user.twoFactorBackupCodes || []);
      }
      
      // Process licensing for the new/updated employee
      await licensingService.processNewEmployeeLicense(tenantId, user.id);
      
      res.status(201).json({
        ...employee,
        userId: user.id,
        isLicensed: true
      });
    } catch (error: any) {
      console.error('Error creating employee with licensing:', error);
      res.status(400).json({ message: "Feil ved opprettelse av ansatt: " + error.message });
    }
  });

  app.put("/api/employees/:id", authenticateToken, requireRole(["admin", "oppdragsansvarlig"]), async (req: AuthRequest, res) => {
    try {
      const employee = await storage.updateEmployee(req.params.id, req.body);
      res.json(employee);
    } catch (error: any) {
      res.status(400).json({ message: "Feil ved oppdatering av ansatt: " + error.message });
    }
  });

  app.delete("/api/employees/:id", authenticateToken, requireRole(["admin", "oppdragsansvarlig"]), async (req: AuthRequest, res) => {
    try {
      await storage.deleteEmployee(req.params.id);
      res.sendStatus(204);
    } catch (error: any) {
      res.status(400).json({ message: "Feil ved sletting av ansatt: " + error.message });
    }
  });

  // Brønnøysund integration
  app.get("/api/bronnoyund/company/:orgNumber", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { orgNumber } = req.params;
      
      // Validate organization number
      if (!orgNumber || !/^\d{9}$/.test(orgNumber.replace(/\s/g, ''))) {
        return res.status(400).json({ 
          message: "Ugyldig organisasjonsnummer. Må være 9 siffer." 
        });
      }

      const { bronnoyundService } = await import("./services/bronnoyund");
      
      // Fetch company data from Brønnøysund
      const companyData = await bronnoyundService.getCompanyData(orgNumber);
      if (!companyData) {
        return res.status(404).json({ 
          message: "Fant ikke selskap med dette organisasjonsnummeret" 
        });
      }

      // Transform and return the data
      const transformedData = bronnoyundService.transformCompanyData(companyData);
      res.json(transformedData);
    } catch (error: any) {
      console.error('Brønnøysund API error:', error);
      res.status(500).json({ 
        message: "Feil ved henting av selskapsdata: " + error.message 
      });
    }
  });

  // Task management
  app.get("/api/tasks", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const tasks = await storage.getAllTasksForTenant(req.user!.tenantId);
      res.json(tasks);
    } catch (error: any) {
      res.status(500).json({ message: "Feil ved henting av oppgaver: " + error.message });
    }
  });

  app.get("/api/tasks/overview", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const tasksOverview = await storage.getTasksOverviewWithClients(req.user!.tenantId);
      res.json(tasksOverview);
    } catch (error: any) {
      res.status(500).json({ message: "Feil ved henting av oppgaveoversikt: " + error.message });
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

  // PATCH endpoint for partial task updates (used by AssigneeDropdown)
  app.patch("/api/tasks/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      console.log('PATCH request for task:', req.params.id, 'with data:', req.body);
      
      // Try to update regular task first
      let updatedTask;
      try {
        updatedTask = await storage.updateTask(req.params.id, req.body);
        console.log('Regular task updated successfully:', updatedTask);
      } catch (regularTaskError) {
        // If regular task update fails, try client task
        console.log('Regular task update failed, trying client task:', regularTaskError.message);
        try {
          updatedTask = await storage.updateClientTask(req.params.id, req.body);
          console.log('Client task updated successfully:', updatedTask);
        } catch (clientTaskError) {
          console.error('Both task updates failed:', { 
            regularError: regularTaskError.message, 
            clientError: clientTaskError.message 
          });
          throw new Error(`Task with id ${req.params.id} not found in either tasks or clientTasks table`);
        }
      }
      
      // Ensure we return the updated task as JSON
      res.status(200).json(updatedTask);
    } catch (error: any) {
      console.error('Error updating task assignee:', error);
      res.status(400).json({ message: "Feil ved oppdatering av oppgave: " + error.message });
    }
  });

  // Complete task with time tracking
  app.put("/api/tasks/:id/complete", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { timeSpent, completionNotes } = req.body;
      
      if (!timeSpent || isNaN(Number(timeSpent)) || Number(timeSpent) <= 0) {
        return res.status(400).json({ message: "Ugyldig tidsinformasjon" });
      }

      let existingTask: any = null;
      let updatedTask: any = null;
      let isClientTask = false;

      // Try to get the task from regular tasks first
      existingTask = await storage.getTask(req.params.id);
      
      // If not found in regular tasks, try client tasks
      if (!existingTask) {
        const clientTasksData = await db
          .select()
          .from(clientTasks)
          .where(eq(clientTasks.id, req.params.id));
        
        if (clientTasksData.length > 0) {
          existingTask = clientTasksData[0];
          isClientTask = true;
        }
      }

      if (!existingTask) {
        return res.status(404).json({ message: "Oppgave ikke funnet" });
      }

      // Update the appropriate task type
      if (isClientTask) {
        updatedTask = await storage.updateClientTask(req.params.id, {
          status: "ferdig",
          completedAt: new Date(),
          completionNotes: completionNotes || null,
          timeSpent: Number(timeSpent)
        });
      } else {
        updatedTask = await storage.updateTask(req.params.id, {
          status: "completed",
          completedAt: new Date(),
          completionNotes: completionNotes || null,
          timeSpent: Number(timeSpent)
        });
      }

      // Create time entry for the completed task
      if (existingTask.clientId) {
        await storage.createTimeEntry({
          tenantId: req.user!.tenantId,
          userId: req.user!.id,
          clientId: existingTask.clientId,
          taskId: req.params.id,
          taskType: isClientTask ? "client_task" : "task",
          description: `${existingTask.taskName || existingTask.title}${completionNotes ? ` - ${completionNotes}` : ''}`,
          timeSpent: Number(timeSpent),
          date: new Date(),
          billable: true
        });
      }

      res.json(updatedTask);
    } catch (error: any) {
      console.error('Task completion error:', error);
      res.status(500).json({ message: "Feil ved fullføring av oppgave: " + error.message });
    }
  });

  // Get completed tasks with filters
  app.get('/api/tasks/completed', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { startDate, endDate, clientId, employeeId } = req.query;
      const tasks = await storage.getCompletedTasks({
        startDate: startDate as string,
        endDate: endDate as string,
        clientId: clientId as string,
        employeeId: employeeId as string,
        userId: req.user!.id,
        userRole: req.user!.role
      });
      res.json(tasks);
    } catch (error) {
      console.error('Error getting completed tasks:', error);
      res.status(500).json({ message: 'Failed to get completed tasks' });
    }
  });

  // Client Responsibles management
  app.get("/api/clients/:clientId/responsibles", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { clientId } = req.params;
      const responsibles = await storage.getClientResponsiblesByClient(clientId);
      res.json(responsibles);
    } catch (error: any) {
      res.status(500).json({ message: "Feil ved henting av oppdragsansvarlige: " + error.message });
    }
  });

  // Update client system configuration  
  app.put("/api/clients/:clientId/system", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { clientId } = req.params;
      console.log(`[REQ] PUT /api/clients/${clientId}/system - body:`, req.body);
      
      const systemData = systemSchema.parse(req.body);
      
      // Update client system info
      const client = await storage.updateClient(clientId, {
        accountingSystem: systemData.system,
        // Additional system-related fields can be added here
      });
      
      console.log(`[REQ] System updated for client ${clientId}:`, systemData.system);
      res.json({ success: true, system: systemData.system });
    } catch (error: any) {
      console.error(`[REQ] PUT /api/clients/${clientId}/system error:`, error);
      res.status(400).json({ message: "Feil ved oppdatering av system: " + error.message });
    }
  });

  app.post("/api/clients/:clientId/responsibles", authenticateToken, requireRole(["admin", "oppdragsansvarlig"]), async (req: AuthRequest, res) => {
    try {
      const { clientId } = req.params;
      console.log(`[REQ] POST /api/clients/${clientId}/responsibles - body:`, req.body);
      
      const responsibleData = addResponsibleSchema.parse(req.body);
      const responsible = await storage.createClientResponsible({
        clientId,
        userId: responsibleData.userId,
        tenantId: req.user!.tenantId,
      });
      
      console.log(`[REQ] Responsible added for client ${clientId}:`, responsibleData.userId);
      res.status(201).json(responsible);
    } catch (error: any) {
      console.error(`[REQ] POST /api/clients/${clientId}/responsibles error:`, error);
      res.status(400).json({ message: "Feil ved opprettelse av oppdragsansvarlig: " + error.message });
    }
  });

  // Setup standard tasks for client based on scopes
  app.post("/api/clients/:clientId/tasks/setup", authenticateToken, requireRole(["admin", "oppdragsansvarlig"]), async (req: AuthRequest, res) => {
    try {
      const { clientId } = req.params;
      console.log(`[REQ] POST /api/clients/${clientId}/tasks/setup - body:`, req.body);
      
      const setupData = tasksSetupSchema.parse(req.body);
      
      // Create standard tasks based on scopes
      const createdTasks = [];
      for (const scope of setupData.scopes) {
        let taskName = scope;
        let description = `Standard oppgave for ${scope}`;
        let interval = 'monthly';
        
        // Map scope to Norwegian task names
        switch (scope) {
          case 'bookkeeping':
            taskName = 'Bokføring';
            description = 'Løpende bokføring';
            interval = 'weekly';
            break;
          case 'mva':
            taskName = 'MVA';
            description = 'Merverdiavgift behandling';
            interval = 'monthly';
            break;
          case 'payroll':
            taskName = 'Lønn';
            description = 'Lønnskjøring';
            interval = 'monthly';
            break;
          default:
            taskName = scope;
        }
        
        const taskData = {
          clientId,
          tenantId: req.user!.tenantId,
          taskName,
          taskType: 'standard' as const,
          description,
          interval,
          repeatInterval: interval === 'weekly' ? 'ukentlig' : 'månedlig',
          status: 'ikke_startet' as const,
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
        };
        
        const task = await storage.createClientTask(taskData);
        createdTasks.push(task);
      }
      
      console.log(`[REQ] Created ${createdTasks.length} standard tasks for client ${clientId}`);
      res.status(201).json({ tasksCreated: createdTasks.length, tasks: createdTasks });
    } catch (error: any) {
      console.error(`[REQ] POST /api/clients/${clientId}/tasks/setup error:`, error);
      res.status(400).json({ message: "Feil ved opprettelse av standardoppgaver: " + error.message });
    }
  });

  // Assign responsible user to client tasks
  app.post("/api/clients/:clientId/tasks/assign-responsible", authenticateToken, requireRole(["admin", "oppdragsansvarlig"]), async (req: AuthRequest, res) => {
    try {
      const { clientId } = req.params;
      console.log(`[REQ] POST /api/clients/${clientId}/tasks/assign-responsible - body:`, req.body);
      
      const assignData = assignResponsibleSchema.parse(req.body);
      
      // Get client tasks
      const tasks = await storage.getClientTasksByClient(clientId, req.user!.tenantId);
      
      let updatedCount = 0;
      for (const task of tasks) {
        // Only update if onlyUnassigned is false or task has no assignee
        if (!assignData.onlyUnassigned || !task.assignedTo) {
          await storage.updateClientTask(task.id, { assignedTo: assignData.userId });
          updatedCount++;
        }
      }
      
      console.log(`[REQ] Assigned responsible ${assignData.userId} to ${updatedCount} tasks for client ${clientId}`);
      res.json({ tasksAssigned: updatedCount, userId: assignData.userId });
    } catch (error: any) {
      console.error(`[REQ] POST /api/clients/${clientId}/tasks/assign-responsible error:`, error);
      res.status(400).json({ message: "Feil ved tildeling av oppgaveansvarlig: " + error.message });
    }
  });

  app.delete("/api/clients/responsibles/:id", authenticateToken, requireRole(["admin", "oppdragsansvarlig"]), async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      await storage.deleteClientResponsible(id);
      res.sendStatus(204);
    } catch (error: any) {
      res.status(400).json({ message: "Feil ved sletting av oppdragsansvarlig: " + error.message });
    }
  });

  // REMOVED: Duplicate handler - using the one above instead

  app.post("/api/clients/:clientId/tasks", authenticateToken, requireRole(["admin", "oppdragsansvarlig", "regnskapsfører"]), async (req: AuthRequest, res) => {
    try {
      const { clientId } = req.params;
      
      console.log('🔍 SERVER: Mottatt oppgavedata:', JSON.stringify(req.body, null, 2));
      
      const taskData = insertClientTaskSchema.parse({
        ...req.body,
        clientId,
        tenantId: req.user!.tenantId,
      });
      
      const task = await storage.createClientTask(taskData);
      console.log('✅ SERVER: Oppgave opprettet:', task);
      
      // Force cache refresh for task overview
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.status(201).json(task);
    } catch (error: any) {
      console.error('❌ SERVER: Validering feilet:', error);
      res.status(400).json({ message: "Feil ved opprettelse av klientoppgave: " + error.message });
    }
  });

  app.put("/api/clients/tasks/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const task = await storage.updateClientTask(id, req.body);
      res.json(task);
    } catch (error: any) {
      res.status(400).json({ message: "Feil ved oppdatering av klientoppgave: " + error.message });
    }
  });

  app.delete("/api/clients/tasks/:id", authenticateToken, requireRole(["admin", "oppdragsansvarlig"]), async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      await storage.deleteClientTask(id);
      res.sendStatus(204);
    } catch (error: any) {
      res.status(400).json({ message: "Feil ved sletting av klientoppgave: " + error.message });
    }
  });

  // Time tracking - get all time entries for tenant with detailed info
  app.get("/api/time-entries", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { startDate, endDate } = req.query;
      const entries = await storage.getTimeEntriesByTenant(
        req.user!.tenantId,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );
      res.json(entries);
    } catch (error: any) {
      res.status(500).json({ message: "Feil ved henting av timer: " + error.message });
    }
  });


  app.put("/api/time-entries/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const entry = await storage.updateTimeEntry(id, req.body);
      res.json(entry);
    } catch (error: any) {
      res.status(400).json({ message: "Feil ved oppdatering av timeføring: " + error.message });
    }
  });

  app.delete("/api/time-entries/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      await storage.deleteTimeEntry(id);
      res.sendStatus(204);
    } catch (error: any) {
      res.status(400).json({ message: "Feil ved sletting av timeføring: " + error.message });
    }
  });

  // Time reporting routes
  app.get("/api/reports/time", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { startDate, endDate, clientId, userId, taskId } = req.query;
      let entries;

      if (clientId) {
        entries = await storage.getTimeEntriesByClient(
          clientId as string,
          startDate ? new Date(startDate as string) : undefined,
          endDate ? new Date(endDate as string) : undefined
        );
      } else if (userId) {
        entries = await storage.getTimeEntriesByUser(
          userId as string,
          startDate ? new Date(startDate as string) : undefined,
          endDate ? new Date(endDate as string) : undefined
        );
      } else {
        entries = await storage.getTimeEntriesByTenant(
          req.user!.tenantId,
          startDate ? new Date(startDate as string) : undefined,
          endDate ? new Date(endDate as string) : undefined
        );
      }
      
      res.json(entries);
    } catch (error: any) {
      res.status(500).json({ message: "Feil ved henting av timerapport: " + error.message });
    }
  });

  // Time report export
  app.get("/api/reports/time/export", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { startDate, endDate, clientId, userId, format = 'excel' } = req.query;
      
      // Get time entries with same logic as above
      let entries;
      if (clientId) {
        entries = await storage.getTimeEntriesByClient(
          clientId as string,
          startDate ? new Date(startDate as string) : undefined,
          endDate ? new Date(endDate as string) : undefined
        );
      } else if (userId) {
        entries = await storage.getTimeEntriesByUser(
          userId as string,
          startDate ? new Date(startDate as string) : undefined,
          endDate ? new Date(endDate as string) : undefined
        );
      } else {
        entries = await storage.getTimeEntriesByTenant(
          req.user!.tenantId,
          startDate ? new Date(startDate as string) : undefined,
          endDate ? new Date(endDate as string) : undefined
        );
      }

      if (format === 'excel') {
        // Simple CSV export (can be opened in Excel)
        const csvData = [
          ['Dato', 'Ansatt', 'Klient', 'Beskrivelse', 'Timer', 'Fakturerbar'],
          ...entries.map((entry: any) => [
            new Date(entry.date).toLocaleDateString('no-NO'),
            entry.user ? `${entry.user.firstName} ${entry.user.lastName}` : 'Ukjent',
            entry.client?.name || 'Ukjent',
            entry.description || '',
            entry.timeSpent.toString(),
            entry.billable ? 'Ja' : 'Nei'
          ])
        ].map(row => row.join(';')).join('\n');

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="timerapport_${startDate}_${endDate}.csv"`);
        res.send('\uFEFF' + csvData); // BOM for Norwegian characters
      } else if (format === 'pdf') {
        // Simple HTML report that can be printed as PDF
        const htmlReport = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <title>Timerapport</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f2f2f2; }
              .header { margin-bottom: 20px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Timerapport</h1>
              <p>Periode: ${startDate} - ${endDate}</p>
              <p>Totalt timer: ${entries.reduce((sum: number, e: any) => sum + e.timeSpent, 0).toFixed(1)}</p>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Dato</th>
                  <th>Ansatt</th>
                  <th>Klient</th>
                  <th>Beskrivelse</th>
                  <th>Timer</th>
                  <th>Fakturerbar</th>
                </tr>
              </thead>
              <tbody>
                ${entries.map((entry: any) => `
                  <tr>
                    <td>${new Date(entry.date).toLocaleDateString('no-NO')}</td>
                    <td>${entry.user ? `${entry.user.firstName} ${entry.user.lastName}` : 'Ukjent'}</td>
                    <td>${entry.client?.name || 'Ukjent'}</td>
                    <td>${entry.description || ''}</td>
                    <td>${entry.timeSpent.toFixed(1)}</td>
                    <td>${entry.billable ? 'Ja' : 'Nei'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </body>
          </html>
        `;

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="timerapport_${startDate}_${endDate}.html"`);
        res.send(htmlReport);
      }
    } catch (error: any) {
      res.status(500).json({ message: "Feil ved eksport av timerapport: " + error.message });
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

  // Bilag count for client cards  
  app.get("/api/bilag-count/:klientId", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const count = await storage.getDocumentCountByClient(req.params.klientId);
      res.json({ count, processed: count > 0 ? Math.floor(count * 0.8) : 0 }); // 80% processed mock
    } catch (error: any) {
      res.status(500).json({ message: "Feil ved telling av bilag: " + error.message });
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
  // Admin route to get all subscriptions and payments
  app.get('/api/admin/subscriptions', authenticateToken, requireRole(['lisensadmin']), async (req: AuthRequest, res) => {
    try {
      // Get all users with their tenants
      const users = await storage.getAllUsersWithTenants();
      
      // Get Stripe subscription data for each user
      const subscriptionsData = await Promise.all(
        users.map(async (user) => {
          let stripeData = null;
          if (user.stripeCustomerId) {
            try {
              const customer = await stripe.customers.retrieve(user.stripeCustomerId);
              const subscriptions = await stripe.subscriptions.list({
                customer: user.stripeCustomerId,
                limit: 10
              });
              
              stripeData = {
                customer,
                subscriptions: subscriptions.data
              };
            } catch (error) {
              console.error(`Error fetching Stripe data for user ${user.id}:`, error);
            }
          }
          
          return {
            user: {
              id: user.id,
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
              tenantName: user.tenantName,
              createdAt: user.createdAt
            },
            stripeData
          };
        })
      );
      
      res.json(subscriptionsData);
    } catch (error: any) {
      console.error('Error fetching admin subscriptions:', error);
      res.status(500).json({ message: 'Feil ved henting av abonnementsoversikt: ' + error.message });
    }
  });

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

  // Authentication middleware - all routes now use consistent authentication

  // Brønnøysund Registry API endpoints
  app.get("/api/bronnoyund/search", authenticateToken, async (req: AuthRequest, res) => {
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

  app.get("/api/bronnoyund/company/:orgNumber", authenticateToken, async (req: AuthRequest, res) => {
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

  app.post("/api/clients/:clientId/registry-data", authenticateToken, async (req: AuthRequest, res) => {
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

  app.get("/api/clients/:clientId/registry-data", authenticateToken, async (req: AuthRequest, res) => {
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
  app.get("/api/aml/providers", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const user = req.user!;
      const providers = await storage.getAmlProvidersByTenant(user.tenantId);
      res.json(providers);
    } catch (error) {
      console.error("Get AML providers error:", error);
      res.status(500).json({ error: "Failed to fetch AML providers" });
    }
  });

  app.post("/api/aml/providers", authenticateToken, async (req: AuthRequest, res) => {
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

  app.post("/api/clients/:clientId/aml-check", authenticateToken, async (req: AuthRequest, res) => {
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
          confidence: result.confidence?.toString() || "0",
          findings: result.findings,
          cost: (result.cost || 0).toString(),
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

  app.get("/api/clients/:clientId/aml-checks", authenticateToken, async (req: AuthRequest, res) => {
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
  app.post("/api/clients/:clientId/aml-documents", authenticateToken, async (req: AuthRequest, res) => {
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

  app.get("/api/clients/:clientId/aml-documents", authenticateToken, async (req: AuthRequest, res) => {
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
  app.get("/api/accounting/adapters", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { accountingAdapterRegistry } = await import("./services/accounting-adapters");
      const adapters = accountingAdapterRegistry.getSupportedSystems();
      res.json(adapters);
    } catch (error) {
      console.error("Get accounting adapters error:", error);
      res.status(500).json({ error: "Failed to fetch accounting adapters" });
    }
  });

  app.get("/api/accounting/integrations", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const user = req.user!;
      const integrations = await storage.getAccountingIntegrationsByTenant(user.tenantId);
      res.json(integrations);
    } catch (error) {
      console.error("Get accounting integrations error:", error);
      res.status(500).json({ error: "Failed to fetch accounting integrations" });
    }
  });

  app.post("/api/accounting/integrations", authenticateToken, async (req: AuthRequest, res) => {
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

  app.post("/api/accounting/integrations/:id/test", authenticateToken, async (req: AuthRequest, res) => {
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

      const isConnected = await adapter.testConnection(integration.syncSettings ? JSON.parse(integration.syncSettings.toString()) : {});
      res.json({ connected: isConnected });
    } catch (error) {
      console.error("Test accounting integration error:", error);
      res.status(500).json({ error: "Failed to test integration" });
    }
  });

  app.post("/api/accounting/integrations/:id/sync", authenticateToken, async (req: AuthRequest, res) => {
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

      const syncResult = await adapter.syncData(integration.syncSettings ? JSON.parse(integration.syncSettings.toString()) : {}, syncSettings);
      res.json(syncResult);
    } catch (error) {
      console.error("Sync accounting integration error:", error);
      res.status(500).json({ error: "Failed to sync data" });
    }
  });

  // Checklist API endpoints
  app.get("/api/checklists/templates", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const templates = await storage.getChecklistTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Get checklist templates error:", error);
      res.status(500).json({ error: "Failed to fetch checklist templates" });
    }
  });

  app.get("/api/checklists/templates/:category", authenticateToken, async (req: AuthRequest, res) => {
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

  app.get("/api/clients/:clientId/checklists", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { clientId } = req.params;
      const checklists = await storage.getClientChecklistsByClient(clientId);
      res.json(checklists);
    } catch (error) {
      console.error("Get client checklists error:", error);
      res.status(500).json({ error: "Failed to fetch client checklists" });
    }
  });

  app.post("/api/clients/:clientId/checklists", authenticateToken, async (req: AuthRequest, res) => {
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

  app.put("/api/clients/:clientId/checklists/:checklistId", authenticateToken, async (req: AuthRequest, res) => {
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
  app.get("/api/plugins/available", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { pluginManagerService } = await import("./services/plugin-manager");
      const plugins = pluginManagerService.getAvailablePlugins();
      res.json(plugins);
    } catch (error) {
      console.error("Get available plugins error:", error);
      res.status(500).json({ error: "Failed to fetch available plugins" });
    }
  });

  app.get("/api/plugins/active", authenticateToken, async (req: AuthRequest, res) => {
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

  app.post("/api/plugins/:pluginId/activate", authenticateToken, async (req: AuthRequest, res) => {
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

  app.post("/api/plugins/:pluginId/deactivate", authenticateToken, async (req: AuthRequest, res) => {
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

  app.post("/api/plugins/:pluginId/execute", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { pluginId } = req.params;
      const { action, data } = req.body;
      const user = req.user!;
      
      // Get plugin configuration
      const configs = await storage.getPluginConfigurationsByTenant(user.tenantId);
      const config = configs.find(c => c.pluginId === pluginId && c.isEnabled);
      
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
  app.post("/api/objects/upload", authenticateToken, async (req: AuthRequest, res) => {
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

  app.get("/api/objects/:objectPath(*)", authenticateToken, async (req: AuthRequest, res) => {
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

  // Register licensing routes
  // Licensing routes
  app.get('/api/subscription', authenticateToken, requireRole(['admin', 'lisensadmin']), async (req: AuthRequest, res) => {
    try {
      const tenantId = req.user!.tenantId;
      const licensingService = new LicensingService();
      
      const subscriptionSummary = await licensingService.getSubscriptionSummary(tenantId);
      
      // Prevent caching to ensure fresh data
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      
      res.json(subscriptionSummary);
    } catch (error: any) {
      console.error('Error fetching subscription summary:', error);
      res.status(500).json({ message: 'Feil ved henting av abonnementsoversikt: ' + error.message });
    }
  });

  app.post('/api/employees/:employeeId/toggle-license', authenticateToken, requireRole(['admin', 'lisensadmin']), async (req: AuthRequest, res) => {
    try {
      const { employeeId } = req.params;
      const tenantId = req.user!.tenantId;
      const licensingService = new LicensingService();
      
      // Get employee to find associated user
      const employee = await storage.getEmployee(employeeId);
      if (!employee) {
        return res.status(404).json({ message: 'Ansatt ikke funnet' });
      }
      
      const user = await storage.getUserByEmail(employee.email);
      if (!user) {
        return res.status(404).json({ message: 'Bruker ikke funnet for ansatt' });
      }
      
      // Get current license status
      const currentStatus = await licensingService.getEmployeeLicenseStatus(tenantId, user.id);
      const newStatus = !currentStatus;
      
      await licensingService.toggleEmployeeLicense(tenantId, user.id, newStatus);
      
      res.json({ 
        success: true, 
        isLicensed: newStatus,
        message: newStatus ? 'Lisens aktivert' : 'Lisens deaktivert' 
      });
    } catch (error: any) {
      console.error('Error toggling employee license:', error);
      res.status(500).json({ message: 'Feil ved endring av lisens: ' + error.message });
    }
  });

  registerLicensingRoutes(app);

  const httpServer = createServer(app);
  

  app.put("/api/clients/:clientId/tasks/:taskId", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const task = await storage.updateClientTask(req.params.taskId, req.body);
      res.json(task);
    } catch (error: any) {
      res.status(400).json({ message: "Feil ved oppdatering av oppgave: " + error.message });
    }
  });

  // Client Responsibles API
  app.get("/api/clients/:clientId/responsibles", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { clientId } = req.params;
      const responsibles = await storage.getClientResponsibles(clientId);
      res.json(responsibles);
    } catch (error: any) {
      res.status(500).json({ message: "Feil ved henting av ansvarlige: " + error.message });
    }
  });

  app.post("/api/clients/:clientId/responsibles", authenticateToken, requireRole(["admin", "oppdragsansvarlig"]), async (req: AuthRequest, res) => {
    try {
      const responsibleData = insertClientResponsibleSchema.parse({
        ...req.body,
        clientId: req.params.clientId,
        tenantId: req.user!.tenantId,
      });
      
      const responsible = await storage.createClientResponsible(responsibleData);
      res.status(201).json(responsible);
    } catch (error: any) {
      res.status(400).json({ message: "Feil ved tildeling av ansvarlig: " + error.message });
    }
  });

  app.delete("/api/clients/:clientId/responsibles/:responsibleId", authenticateToken, requireRole(["admin", "oppdragsansvarlig"]), async (req: AuthRequest, res) => {
    try {
      await storage.deleteClientResponsible(req.params.responsibleId);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ message: "Feil ved fjerning av ansvarlig: " + error.message });
    }
  });

  // Enhanced Time Tracking with modal functionality
  app.post("/api/time-entries", authenticateToken, async (req: AuthRequest, res) => {
    try {
      console.log("DEBUG: Request body:", req.body);
      console.log("DEBUG: User info:", { id: req.user!.id, tenantId: req.user!.tenantId });
      
      // Clean up taskId if it's empty string
      const cleanBody = {
        ...req.body,
        taskId: req.body.taskId === '' ? undefined : req.body.taskId
      };
      
      const timeEntryData = insertTimeEntrySchema.parse({
        ...cleanBody,
        userId: req.user!.id, // Always use current logged in user
        tenantId: req.user!.tenantId,
      });
      
      console.log("DEBUG: Parsed time entry data:", timeEntryData);
      
      const timeEntry = await storage.createTimeEntry(timeEntryData);
      
      // Send notification if time entry is for a specific task
      if (timeEntry.taskId) {
        await sendTaskNotification(
          req.user!.email,
          "Timeføring registrert",
          new Date(),
          false
        );
      }
      
      res.status(201).json(timeEntry);
    } catch (error: any) {
      console.log("DEBUG: Time entry error:", error.message);
      console.log("DEBUG: Full error:", error);
      res.status(400).json({ message: "Feil ved registrering av timer: " + error.message });
    }
  });

  app.put("/api/time-entries/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const timeEntry = await storage.updateTimeEntry(req.params.id, req.body);
      res.json(timeEntry);
    } catch (error: any) {
      res.status(400).json({ message: "Feil ved oppdatering av timeregistrering: " + error.message });
    }
  });

  // Enhanced Time Reports with filtering and export
  app.get("/api/reports/time-entries", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { clientId, userId, taskId, startDate, endDate, exportFormat } = req.query;
      
      const filters = {
        tenantId: req.user!.tenantId,
        clientId: clientId as string,
        userId: userId as string,
        taskId: taskId as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
      };
      
      const timeEntries = await storage.getTimeEntriesWithFilters(filters);
      
      // If export format is requested, generate report
      if (exportFormat === 'excel' || exportFormat === 'pdf') {
        const { reportService } = await import("./services/reporting");
        const reportBuffer = await reportService.generateTimeReport(timeEntries, exportFormat as 'excel' | 'pdf');
        
        const filename = `timeregistrering_${new Date().toISOString().split('T')[0]}.${exportFormat === 'excel' ? 'xlsx' : 'pdf'}`;
        
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', exportFormat === 'excel' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'application/pdf');
        res.send(reportBuffer);
      } else {
        res.json(timeEntries);
      }
    } catch (error: any) {
      res.status(500).json({ message: "Feil ved generering av rapport: " + error.message });
    }
  });

  // Accounting System URLs for client access
  app.get("/api/accounting-systems/urls", authenticateToken, async (req: AuthRequest, res) => {
    const accountingSystemUrls = {
      fiken: "https://fiken.no",
      tripletex: "https://tripletex.no", 
      unimicro: "https://unimicro.no",
      poweroffice: "https://poweroffice.no",
      conta: "https://conta.no"
    };
    
    res.json(accountingSystemUrls);
  });

  // Enhanced RBAC endpoints for Admin/Ansatt
  app.get("/api/clients/assigned", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const clients = await storage.getAssignedClients(req.user!.id, req.user!.role);
      res.json(clients);
    } catch (error: any) {
      res.status(500).json({ message: "Feil ved henting av tildelte klienter: " + error.message });
    }
  });

  // Enhanced dashboard with role-based KPIs
  app.get("/api/dashboard/enhanced-metrics", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const metrics = await storage.getEnhancedDashboardMetrics(req.user!.tenantId, req.user!.id, req.user!.role);
      res.json(metrics);
    } catch (error: any) {
      res.status(500).json({ message: "Feil ved henting av utvidede metrics: " + error.message });
    }
  });

  // Backup and export endpoints (Admin only)
  app.post("/api/admin/backup", authenticateToken, requireRole(["admin"]), async (req: AuthRequest, res) => {
    try {
      const { backupType, dataTypes } = req.body;
      const result = await storage.createBackup(req.user!.tenantId, backupType, dataTypes);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: "Backup feilet: " + error.message });
    }
  });

  app.get("/api/admin/export/clients", authenticateToken, requireRole(["admin"]), async (req: AuthRequest, res) => {
    try {
      const { clientIds, format } = req.query;
      const exportData = await storage.exportClientData(
        req.user!.tenantId, 
        clientIds ? (clientIds as string).split(',') : undefined,
        (format as 'csv' | 'excel') || 'excel'
      );
      
      const filename = `clients_export_${new Date().toISOString().split('T')[0]}.${format === 'csv' ? 'csv' : 'xlsx'}`;
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.send(exportData);
    } catch (error: any) {
      res.status(500).json({ message: "Export feilet: " + error.message });
    }
  });

  // Calendar integration endpoints
  app.post("/api/calendar/sync", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { provider } = req.body;
      const result = await storage.syncCalendarEvents(req.user!.id, provider);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: "Kalender sync feilet: " + error.message });
    }
  });

  // Enhanced notifications with email support
  app.post("/api/notifications/advanced", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const notification = {
        ...req.body,
        tenantId: req.user!.tenantId
      };
      const created = await storage.createAdvancedNotification(notification);
      res.status(201).json(created);
    } catch (error: any) {
      res.status(400).json({ message: "Feil ved opprettelse av varsel: " + error.message });
    }
  });

  // Document audit logging endpoint
  app.post("/api/documents/:documentId/audit", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { action, details } = req.body;
      await storage.logDocumentAction(req.params.documentId, req.user!.tenantId, action, req.user!.id, details);
      res.status(201).json({ message: "Audit log opprettet" });
    } catch (error: any) {
      res.status(400).json({ message: "Audit logging feilet: " + error.message });
    }
  });

  // Mobile responsive check endpoint
  app.get("/api/system/mobile-support", (req, res) => {
    res.json({
      responsive: true,
      supportedFeatures: [
        "time_tracking", "client_management", "document_upload", 
        "notifications", "task_management", "dashboard"
      ],
      mobileApp: {
        available: false,
        plannedFeatures: ["push_notifications", "offline_mode", "biometric_auth"]
      }
    });
  });

  // AI-powered report generator
  app.post('/api/reports/generate', authenticateToken, async (req: AuthRequest, res) => {
    const { query, tidsrom, filters } = req.body;
    
    try {
      // Parse the user query and generate report specification
      const reportSpec = await generateReportSpecification(query, tidsrom, filters);
      
      // Execute the report based on specification
      const reportData = await executeReport(reportSpec, req.user!.tenantId, storage);
      
      // This will be handled in the result section
      
      // Generate SQL/pseudocode
      const sqlPseudocode = generateSQLPseudocode(reportSpec);
      
      // Generate suggested variants
      const variants = generateReportVariants(query);
      
      // Create CSV and Excel files
      const csvContent = generateCSV(reportData.data);
      const excelContent = generateExcel(reportData.data, reportSpec.title);
      
      // Save report as document
      const reportDocument = await storage.createDocument({
        tenantId: req.user!.tenantId,
        clientId: null, // System generated report
        fileName: `${reportSpec.title}_${new Date().toISOString().split('T')[0]}.csv`,
        fileType: 'text/csv',
        fileSize: csvContent.length,
        category: 'Rapporter',
        processed: true,
        uploadedBy: req.user!.id,
        aiSuggestions: { 
          reportData: reportData.data.slice(0, 5), // Store sample data
          totals: reportData.totals,
          query: query 
        }
      });

      console.log('Report debug - Created document:', reportDocument.id);

      const result = {
        title: reportSpec.title,
        description: reportSpec.description,
        spec: reportSpec,
        data: reportData.data,
        totals: reportData.totals,
        csv: csvContent,
        excel: excelContent,
        documentId: reportDocument.id,
        sql: sqlPseudocode,
        variants: variants
      };
      
      res.json(result);
    } catch (error: any) {
      console.error('Error generating report:', error);
      res.status(500).json({ message: 'Failed to generate report: ' + error.message });
    }
  });

  // Documents routes
  app.get('/api/documents', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const user = req.user;
      const documents = await storage.getDocumentsByTenant(user.tenantId);
      
      // Add additional metadata for UI
      const enrichedDocuments = documents.map(doc => ({
        ...doc,
        name: doc.fileName,
        description: doc.category === 'Rapporter' ? 
          `Generert rapport - ${doc.fileName}` : 
          `Dokument - ${doc.fileName}`,
        size: doc.fileSize || 0,
        downloadUrl: `/api/documents/${doc.id}/download`
      }));
      
      res.json(enrichedDocuments);
    } catch (error: any) {
      console.error('Error fetching documents:', error);
      res.status(500).json({ message: 'Failed to fetch documents: ' + error.message });
    }
  });

  // Delete a document
  app.delete("/api/documents/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const documentId = req.params.id;
      
      // Get the document to verify ownership
      const documents = await storage.getDocumentsByTenant(req.user!.tenantId);
      const document = documents.find(d => d.id === documentId);
      
      if (!document) {
        return res.status(404).json({ message: "Dokument ikke funnet" });
      }
      
      // Delete the document
      await storage.deleteDocument(documentId);
      
      res.status(200).json({ message: "Dokument slettet" });
    } catch (error: any) {
      console.error('Error deleting document:', error);
      res.status(500).json({ message: 'Feil ved sletting av dokument: ' + error.message });
    }
  });

  // Generate report data based on time entries grouped by client
  const generateTimeReportData = async (tenantId: string) => {
    try {
      // Get all time entries for the tenant
      const timeEntries = await storage.getTimeEntriesByTenant(tenantId);
      
      if (!timeEntries || timeEntries.length === 0) {
        return [];
      }

      // Group by client and calculate totals
      const clientTotals = new Map();
      
      for (const entry of timeEntries) {
        const clientName = entry.client?.name || 'Ukjent Klient';
        const key = clientName;
        
        if (!clientTotals.has(key)) {
          clientTotals.set(key, {
            Dato: entry.date,
            Ansatt: entry.user?.firstName && entry.user?.lastName ? 
              `${entry.user.firstName} ${entry.user.lastName}` : 'Ukjent Ansatt',
            Klient: clientName,
            Beskrivelse: '',
            Timer: 0,
            Fakturerbar: entry.billable ? 'Ja' : 'Nei',
            Type: entry.taskType || 'Oppgave',
            entries: []
          });
        }
        
        const existing = clientTotals.get(key);
        existing.Timer += parseFloat(entry.timeSpent || '0');
        existing.entries.push({
          date: entry.date,
          description: entry.description,
          hours: parseFloat(entry.timeSpent || '0'),
          billable: entry.billable
        });
        
        // Use the most recent description
        if (entry.description) {
          existing.Beskrivelse = entry.description;
        }
      }

      // Convert to array and sort by client name
      const reportData = Array.from(clientTotals.values())
        .sort((a, b) => a.Klient.localeCompare(b.Klient))
        .map(item => ({
          Dato: item.Dato,
          Ansatt: item.Ansatt,
          Klient: item.Klient,
          Beskrivelse: item.Beskrivelse,
          Timer: `${item.Timer.toFixed(2)}t`,
          Fakturerbar: item.Fakturerbar,
          Type: item.Type
        }));
      
      return reportData;
    } catch (error) {
      console.error('Error generating time report data:', error);
      return [];
    }
  };

  // Handle both GET and POST for downloads (auth handled by middleware now)
  const downloadHandler = async (req: AuthRequest, res: any) => {
    try {
      const documentId = req.params.id;
      
      // Get the document
      const documents = await storage.getDocumentsByTenant(req.user!.tenantId);
      const document = documents.find(d => d.id === documentId);
      
      if (!document) {
        return res.status(404).json({ message: 'Document not found' });
      }
      
      // Generate fresh report data from time entries
      let reportData = [];
      if (document.fileName?.includes('Timer per klient')) {
        reportData = await generateTimeReportData(req.user!.tenantId);
      } else if (document.aiSuggestions && document.aiSuggestions.reportData) {
        reportData = document.aiSuggestions.reportData;
      }
      
      if (reportData.length === 0) {
        reportData = [{ 
          Melding: 'Ingen timeregistreringer funnet for denne perioden' 
        }];
      }
      
      // Generate content
      const csvContent = generateCSV(reportData);
      const format = req.query.format as string || req.body?.format as string;
      
      if (format === 'excel' || document.fileName?.includes('.xlsx')) {
        const excelContent = generateExcel(reportData, document.fileName?.replace('.csv', ''));
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${document.fileName?.replace('.csv', '.xlsx')}"`);
        res.send(excelContent);
      } else {
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${document.fileName}"`);
        res.send('\ufeff' + csvContent); // Add BOM for proper UTF-8 encoding
      }
    } catch (error: any) {
      console.error('Error downloading document:', error);
      res.status(500).json({ message: 'Failed to download document: ' + error.message });
    }
  };

  // Register both GET and POST handlers for downloads with authentication
  app.get('/api/documents/:id/download', authenticateToken, downloadHandler);
  app.post('/api/documents/:id/download', authenticateToken, downloadHandler);
  
  // Simple test endpoint to verify POST is working
  app.post('/api/test-post', (req, res) => {
    console.log('Test POST endpoint hit:', {
      method: req.method,
      body: req.body,
      headers: req.headers['content-type']
    });
    res.json({ success: true, receivedBody: req.body });
  });

  // View document data endpoint
  app.get('/api/documents/:id/view', authenticateToken, async (req: any, res: any) => {
    try {
      const documentId = req.params.id;
      const document = await storage.getDocument(documentId);
      
      if (!document) {
        return res.status(404).json({ message: 'Document not found' });
      }



      // Get original report data in priority order
      let documentData;
      if (document.aiSuggestions?.reportData) {
        documentData = document.aiSuggestions.reportData;
      }
      else if (document.data) {
        try {
          documentData = typeof document.data === 'string' 
            ? JSON.parse(document.data) 
            : document.data;
        } catch (parseError) {
          documentData = [];
        }
      }
      // If no existing data, generate from time entries
      if (!documentData || (Array.isArray(documentData) && documentData.length === 0)) {
        if (document.fileName?.includes('Timer per klient')) {
          documentData = await generateTimeReportData(req.user!.tenantId);
        } else {
          documentData = [{ 
            Melding: 'Ingen data tilgjengelig for denne rapporten' 
          }];
        }
      }

      res.json(documentData || []);
    } catch (error) {
      console.error('Error viewing document:', error);
      res.status(500).json({ message: 'Failed to view document: ' + error.message });
    }
  });

  // Test endpoint to verify token is working
  app.get('/api/documents/:id/test', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const user = req.user;
      const documentId = req.params.id;
      
      res.json({ 
        success: true, 
        message: 'Token verified successfully',
        user: { id: user.id, email: user.email },
        documentId: documentId
      });
    } catch (error: any) {
      console.error('Test endpoint error:', error);
      res.status(500).json({ message: 'Test failed: ' + error.message });
    }
  });

  // Delete document endpoint
  app.delete('/api/documents/:id', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const user = req.user;
      const documentId = req.params.id;
      
      // Get document to verify ownership/tenant
      const documents = await storage.getDocumentsByTenant(user.tenantId);
      const document = documents.find(d => d.id === documentId);
      
      if (!document) {
        return res.status(404).json({ message: 'Document not found' });
      }
      
      // Delete document (you'll need to implement deleteDocument in storage)
      await storage.deleteDocument(documentId);
      
      res.json({ message: 'Document deleted successfully' });
    } catch (error: any) {
      console.error('Error deleting document:', error);
      res.status(500).json({ message: 'Failed to delete document: ' + error.message });
    }
  });

  // System Owner Billing Routes (KUN for stian@zaldo.no)
  app.get('/api/system-owner/billing', authenticateToken, async (req: AuthRequest, res) => {
    try {
      // Sjekk at kun systemets eier har tilgang
      if (req.user!.email !== 'stian@zaldo.no') {
        return res.status(403).json({ message: 'Kun systemets eier har tilgang til faktureringsdata' });
      }

      const { format } = req.query;

      // Hent alle tenants med deres lisensinformasjon
      const tenantsData = await db
        .select({
          id: tenants.id,
          name: tenants.name,
          orgNumber: tenants.orgNumber,
          email: tenants.email,
          subscriptionStatus: tenants.subscriptionStatus,
          monthlyRate: tenants.monthlyRate,
          trialStartDate: tenants.trialStartDate,
          trialEndDate: tenants.trialEndDate,
          lastBilledDate: tenants.lastBilledDate,
          createdAt: tenants.createdAt,
        })
        .from(tenants)
        .orderBy(tenants.createdAt);

      // For hver tenant, hent antall lisensierte brukere
      const enrichedTenants = await Promise.all(
        tenantsData.map(async (tenant) => {
          const [licenseCount] = await db
            .select({ count: sql<number>`count(*)` })
            .from(users)
            .where(
              and(
                eq(users.tenantId, tenant.id),
                eq(users.isLicensed, true)
              )
            );

          const licensedUsers = licenseCount.count;
          const baseRate = 2500; // Fast basepris
          const userLicenseCost = licensedUsers * 500; // 500 kr per lisensiert bruker
          const totalMonthlyAmount = baseRate + userLicenseCost;

          const formatDate = (date: string | null) => {
            if (!date) return '';
            return new Date(date).toLocaleDateString('no-NO');
          };

          return {
            ...tenant,
            licensedUsers,
            totalMonthlyAmount,
            monthlyRate: baseRate,
            trialEndDate: tenant.trialStartDate ? 
              new Date(new Date(tenant.trialStartDate).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString() : // 30 dagers prøveperiode
              null,
            formattedTrialStart: formatDate(tenant.trialStartDate),
            formattedTrialEnd: tenant.trialStartDate ? 
              formatDate(new Date(new Date(tenant.trialStartDate).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()) : '',
            formattedCreatedAt: formatDate(tenant.createdAt),
            formattedLastBilled: formatDate(tenant.lastBilledDate)
          };
        })
      );

      // Hvis Excel-eksport er forespurt
      if (format === 'excel') {
        const excelData = enrichedTenants.map(tenant => ({
          'Bedriftsnavn': tenant.name,
          'Org.nummer': tenant.orgNumber,
          'E-post': tenant.email,
          'Status': tenant.subscriptionStatus,
          'Lisensierte brukere': tenant.licensedUsers,
          'Basepris': `${tenant.monthlyRate} kr`,
          'Brukerkostnad': `${tenant.licensedUsers * 500} kr`,
          'Total månedlig': `${tenant.totalMonthlyAmount} kr`,
          'Prøveperiode start': tenant.formattedTrialStart,
          'Prøveperiode slutt': tenant.formattedTrialEnd,
          'Opprettet': tenant.formattedCreatedAt,
          'Sist fakturert': tenant.formattedLastBilled
        }));

        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(excelData);
        
        // Sett kolonnebredder
        const columnWidths = [
          { wch: 25 }, // Bedriftsnavn
          { wch: 12 }, // Org.nummer
          { wch: 30 }, // E-post
          { wch: 12 }, // Status
          { wch: 15 }, // Lisensierte brukere
          { wch: 12 }, // Basepris
          { wch: 15 }, // Brukerkostnad
          { wch: 15 }, // Total månedlig
          { wch: 15 }, // Prøveperiode start
          { wch: 15 }, // Prøveperiode slutt
          { wch: 12 }, // Opprettet
          { wch: 15 }  // Sist fakturert
        ];
        worksheet['!cols'] = columnWidths;

        XLSX.utils.book_append_sheet(workbook, worksheet, 'Systemfakturering');
        
        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        const filename = `systemfakturering_${new Date().toISOString().split('T')[0]}.xlsx`;
        
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
        return;
      }

      res.json(enrichedTenants);
    } catch (error: any) {
      console.error('Error fetching system billing data:', error);
      res.status(500).json({ message: 'Feil ved henting av faktureringsoversikt: ' + error.message });
    }
  });

  return httpServer;
}

// Helper functions for report generation

async function generateReportSpecification(query: string, tidsrom: any, filters: any) {
  // Parse user query and create structured specification
  const spec = {
    id: `report_${Date.now()}`,
    title: extractReportTitle(query),
    description: `Rapport basert på forespørsel: "${query}"`,
    tidsrom: tidsrom || { start: new Date().toISOString().split('T')[0], slutt: new Date().toISOString().split('T')[0] },
    filtere: Object.keys(filters || {}),
    gruppering: extractGroupingFromQuery(query),
    kpier: extractKPIsFromQuery(query),
    sortering: 'dato DESC',
    format: 'Tabell' as const
  };
  
  return spec;
}

async function executeReport(spec: any, tenantId: string, storage: any) {
  // Based on the spec, execute the appropriate data queries
  const startDate = new Date(spec.tidsrom.start);
  const endDate = new Date(spec.tidsrom.slutt);
  
  // Get time entries as base data
  const timeEntries = await storage.getTimeEntriesByTenant(tenantId, startDate, endDate);
  console.log('Report debug - Time entries found:', timeEntries.length);
  console.log('Report debug - Date range:', startDate, 'to', endDate);
  console.log('Report debug - Spec grouping:', spec.gruppering);
  console.log('Report debug - First few entries:', timeEntries.slice(0, 2));
  console.log('Report debug - timeSpent types:', timeEntries.slice(0, 2).map(e => ({ id: e.id, timeSpent: e.timeSpent, type: typeof e.timeSpent })));

  // Process data for display
  const { data, totals } = await processReportData(timeEntries, spec);
  console.log('Report debug - Processed data:', data.slice(0, 2));
  console.log('Report debug - Totals:', totals);
  
  return { data, totals };
}

async function processReportData(timeEntries: any[], spec: any) {
  let data: any[] = [];
  let totals: Record<string, number> = {};
  
  if (spec.gruppering.includes('klient') || spec.gruppering.includes('client')) {
    // Group by client
    const grouped = timeEntries.reduce((acc: any, entry: any) => {
      const clientName = entry.clientName || 'Ukjent klient';
      if (!acc[clientName]) {
        acc[clientName] = { 
          Klient: clientName, 
          'Totale timer': 0, 
          'Fakturerbare timer': 0, 
          'Ikke-fakturerbare timer': 0,
          'Antall registreringer': 0
        };
      }
      acc[clientName]['Totale timer'] += parseFloat(entry.timeSpent) || 0;
      if (entry.billable) {
        acc[clientName]['Fakturerbare timer'] += parseFloat(entry.timeSpent) || 0;
      } else {
        acc[clientName]['Ikke-fakturerbare timer'] += parseFloat(entry.timeSpent) || 0;
      }
      acc[clientName]['Antall registreringer'] += 1;
      return acc;
    }, {});
    
    data = Object.values(grouped);
    totals = {
      'Totale timer': data.reduce((sum, row) => sum + row['Totale timer'], 0),
      'Fakturerbare timer': data.reduce((sum, row) => sum + row['Fakturerbare timer'], 0),
      'Antall klienter': data.length,
      'Totale registreringer': data.reduce((sum, row) => sum + row['Antall registreringer'], 0)
    };
  } else if (spec.gruppering.includes('ansatt') || spec.gruppering.includes('employee')) {
    // Group by employee
    const grouped = timeEntries.reduce((acc: any, entry: any) => {
      const employeeName = entry.userName || 'Ukjent ansatt';
      if (!acc[employeeName]) {
        acc[employeeName] = { 
          Ansatt: employeeName, 
          'Totale timer': 0, 
          'Fakturerbare timer': 0, 
          'Ikke-fakturerbare timer': 0,
          'Antall registreringer': 0
        };
      }
      acc[employeeName]['Totale timer'] += parseFloat(entry.timeSpent) || 0;
      if (entry.billable) {
        acc[employeeName]['Fakturerbare timer'] += parseFloat(entry.timeSpent) || 0;
      } else {
        acc[employeeName]['Ikke-fakturerbare timer'] += parseFloat(entry.timeSpent) || 0;
      }
      acc[employeeName]['Antall registreringer'] += 1;
      return acc;
    }, {});
    
    data = Object.values(grouped);
    totals = {
      'Totale timer': data.reduce((sum, row) => sum + row['Totale timer'], 0),
      'Fakturerbare timer': data.reduce((sum, row) => sum + row['Fakturerbare timer'], 0),
      'Antall ansatte': data.length,
      'Totale registreringer': data.reduce((sum, row) => sum + row['Antall registreringer'], 0)
    };
  } else {
    // Default detailed view
    data = timeEntries.map((entry: any) => ({
      Dato: new Date(entry.date).toLocaleDateString('no-NO'),
      Ansatt: entry.userName || 'Ukjent',
      Klient: entry.clientName || 'Ukjent',
      Beskrivelse: entry.description || '',
      Timer: parseFloat(entry.timeSpent) || 0,
      Fakturerbar: entry.billable ? 'Ja' : 'Nei'
    }));
    
    totals = {
      'Totale timer': timeEntries.reduce((sum: number, entry: any) => sum + (parseFloat(entry.timeSpent) || 0), 0),
      'Fakturerbare timer': timeEntries.filter((e: any) => e.billable).reduce((sum: number, entry: any) => sum + (parseFloat(entry.timeSpent) || 0), 0),
      'Totale registreringer': timeEntries.length,
      'Unike klienter': new Set(timeEntries.map((e: any) => e.clientId)).size
    };
  }
  
  return { data, totals };
}

function generateCSV(data: any[]): string {
  if (!data.length) return '';
  
  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(';'),
    ...data.map(row => 
      headers.map(header => {
        const cell = row[header];
        if (typeof cell === 'number') return cell.toFixed(2);
        return `"${cell || ''}"`;
      }).join(';')
    )
  ];
  
  return csvRows.join('\n');
}

function generateExcel(data: any[], title: string): string {
  // For now, return CSV format - in production you'd use a library like xlsx
  const csv = generateCSV(data);
  return `# ${title}\n# Generert: ${new Date().toLocaleDateString('nb-NO')}\n\n${csv}`;
}

function generateSQLPseudocode(spec: any): string {
  return `-- Rapportgenerering: ${spec.title}
-- Periode: ${spec.tidsrom.start} til ${spec.tidsrom.slutt}

SELECT 
  ${spec.gruppering.includes('klient') ? 'c.name AS Klient,' : ''}
  ${spec.gruppering.includes('ansatt') ? 'u.firstName || \' \' || u.lastName AS Ansatt,' : ''}
  SUM(te.timeSpent) AS "Totale timer",
  SUM(CASE WHEN te.billable = true THEN te.timeSpent ELSE 0 END) AS "Fakturerbare timer",
  COUNT(*) AS "Antall registreringer"
FROM timeEntries te
LEFT JOIN clients c ON te.clientId = c.id
LEFT JOIN users u ON te.userId = u.id
WHERE te.date >= '${spec.tidsrom.start}'
  AND te.date <= '${spec.tidsrom.slutt}'
  ${spec.filtere.includes('clientId') ? 'AND te.clientId = :clientId' : ''}
  ${spec.filtere.includes('employeeId') ? 'AND te.userId = :employeeId' : ''}
GROUP BY ${spec.gruppering.join(', ') || '1'}
ORDER BY ${spec.sortering}`;
}

function generateReportVariants(originalQuery: string): string[] {
  const variants = [
    'Vis samme data gruppert etter måned',
    'Legg til kostnadsanalyse med timesatser',
    'Sammenlign med forrige periode',
    'Inkluder bare fakturerbare timer',
    'Analyser produktivitet per ansatt'
  ];
  
  return variants;
}

function extractReportTitle(query: string): string {
  if (query.toLowerCase().includes('klient')) return 'Timer per klient';
  if (query.toLowerCase().includes('ansatt')) return 'Timer per ansatt';
  if (query.toLowerCase().includes('fakturerbar')) return 'Faktureringsanalyse';
  if (query.toLowerCase().includes('produktivitet')) return 'Produktivitetsrapport';
  if (query.toLowerCase().includes('lønnsomhet')) return 'Lønnsomhetsanalyse';
  return 'Tilpasset rapport';
}

function extractGroupingFromQuery(query: string): string[] {
  const groupings: string[] = [];
  if (query.toLowerCase().includes('klient')) groupings.push('klient');
  if (query.toLowerCase().includes('ansatt')) groupings.push('ansatt');
  if (query.toLowerCase().includes('måned')) groupings.push('måned');
  if (query.toLowerCase().includes('uke')) groupings.push('uke');
  return groupings;
}

function extractKPIsFromQuery(query: string): string[] {
  const kpis: string[] = ['timer', 'fakturerbare_timer'];
  if (query.toLowerCase().includes('kostnad')) kpis.push('kostnad');
  if (query.toLowerCase().includes('margin')) kpis.push('margin');
  if (query.toLowerCase().includes('produktivitet')) kpis.push('utnyttelsesgrad');
  return kpis;
}

// TODO: Add engagement routes integration when ready
