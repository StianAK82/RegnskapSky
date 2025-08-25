import type { Express } from "express";
import { createServer, type Server } from "http";
import Stripe from "stripe";
import { storage } from "./storage";
import { authenticateToken, requireRole, requireSameTenant, hashPassword, comparePassword, generateToken, type AuthRequest } from "./auth";
import { categorizeDocument, generateAccountingSuggestions, askAccountingQuestion, analyzeDocumentImage } from "./services/openai";
import { sendTaskNotification, sendWelcomeEmail, sendSubscriptionNotification } from "./services/sendgrid";
import { bronnoyundService } from "./services/bronnoyund";
import { 
  insertUserSchema, insertTenantSchema, insertClientSchema, insertTaskSchema, 
  insertClientTaskSchema, insertClientResponsibleSchema, insertEmployeeSchema,
  insertTimeEntrySchema, insertDocumentSchema, insertNotificationSchema, insertIntegrationSchema,
  insertCompanyRegistryDataSchema, insertAmlProviderSchema, insertAmlDocumentSchema,
  insertAccountingIntegrationSchema, insertClientChecklistSchema,
  type User, clientTasks
} from "../shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-07-30.basil",
});

// bronnoyundService is imported as default export

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

  // Client task overview
  app.get("/api/clients/task-overview", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const clientsOverview = await storage.getClientsWithTaskOverview(req.user!.tenantId);
      res.json(clientsOverview);
    } catch (error: any) {
      res.status(500).json({ message: "Feil ved henting av klientoppgaveoversikt: " + error.message });
    }
  });

  // Client management
  app.get("/api/clients", authenticateToken, async (req: AuthRequest, res) => {
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

  app.post("/api/clients", authenticateToken, requireRole(["admin", "oppdragsansvarlig"]), async (req: AuthRequest, res) => {
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
          interval: task.interval,
          dueDate: task.dueDate,
          status: "ikke_startet"
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
      res.json(client);
    } catch (error: any) {
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
      const { status, limit } = req.query;
      const clientId = req.params.id;

      // Validate client belongs to tenant
      const client = await storage.getClient(clientId);
      if (!client || client.tenantId !== req.user!.tenantId) {
        return res.status(404).json({ message: "Klient ikke funnet" });
      }

      const tasks = await storage.getTaskInstancesByClient(clientId, {
        status: status as string,
        limit: limit ? parseInt(limit as string) : undefined
      });

      res.json(tasks);
    } catch (error: any) {
      res.status(500).json({ message: "Feil ved henting av oppgaver: " + error.message });
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

  // Employee management
  app.get("/api/employees", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const employees = await storage.getEmployeesByTenant(req.user!.tenantId);
      res.json(employees);
    } catch (error: any) {
      res.status(500).json({ message: "Feil ved henting av ansatte: " + error.message });
    }
  });

  app.post("/api/employees", authenticateToken, requireRole(["admin", "oppdragsansvarlig"]), async (req: AuthRequest, res) => {
    try {
      const employeeData = insertEmployeeSchema.parse({
        ...req.body,
        tenantId: req.user!.tenantId,
      });
      
      const employee = await storage.createEmployee(employeeData);
      res.status(201).json(employee);
    } catch (error: any) {
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

  app.post("/api/clients/:clientId/responsibles", authenticateToken, requireRole(["admin", "oppdragsansvarlig"]), async (req: AuthRequest, res) => {
    try {
      const { clientId } = req.params;
      const { userId } = req.body;
      const responsible = await storage.createClientResponsible({
        clientId,
        userId,
        tenantId: req.user!.tenantId,
      });
      res.status(201).json(responsible);
    } catch (error: any) {
      res.status(400).json({ message: "Feil ved opprettelse av oppdragsansvarlig: " + error.message });
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

  // Client Tasks management
  app.get("/api/clients/:clientId/tasks", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { clientId } = req.params;
      const tasks = await storage.getClientTasksByClient(clientId);
      res.json(tasks);
    } catch (error: any) {
      res.status(500).json({ message: "Feil ved henting av klientoppgaver: " + error.message });
    }
  });

  app.post("/api/clients/:clientId/tasks", authenticateToken, requireRole(["admin", "oppdragsansvarlig", "regnskapsfører"]), async (req: AuthRequest, res) => {
    try {
      const { clientId } = req.params;
      const taskData = insertClientTaskSchema.parse({
        ...req.body,
        clientId,
        tenantId: req.user!.tenantId,
      });
      
      const task = await storage.createClientTask(taskData);
      res.status(201).json(task);
    } catch (error: any) {
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

  const httpServer = createServer(app);
  
  // Enhanced Client Tasks and Time Tracking API (moved before server creation)
  app.get("/api/clients/:clientId/tasks", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { clientId } = req.params;
      const tasks = await storage.getClientTasksByClient(clientId);
      res.json(tasks);
    } catch (error: any) {
      res.status(500).json({ message: "Feil ved henting av klientoppgaver: " + error.message });
    }
  });

  app.post("/api/clients/:clientId/tasks", authenticateToken, requireRole(["admin", "oppdragsansvarlig"]), async (req: AuthRequest, res) => {
    try {
      const taskData = insertClientTaskSchema.parse({
        ...req.body,
        clientId: req.params.clientId,
        tenantId: req.user!.tenantId,
      });
      
      const task = await storage.createClientTask(taskData);
      res.status(201).json(task);
    } catch (error: any) {
      res.status(400).json({ message: "Feil ved opprettelse av oppgave: " + error.message });
    }
  });

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
      const timeEntryData = insertTimeEntrySchema.parse({
        ...req.body,
        userId: req.user!.id,
        tenantId: req.user!.tenantId,
      });
      
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

  return httpServer;
}
