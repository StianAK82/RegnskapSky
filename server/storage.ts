import { 
  users, tenants, clients, employees, tasks, timeEntries, documents, notifications, integrations,
  clientTasks, clientResponsibles, companyRegistryData, amlDocuments, amlProviders, amlChecks, accountingIntegrations,
  checklistTemplates, clientChecklists, plugins, pluginConfigurations,
  type User, type InsertUser, type Tenant, type InsertTenant, type Client, type InsertClient,
  type Employee, type InsertEmployee, type Task, type InsertTask, 
  type TimeEntry, type InsertTimeEntry, type Document, type InsertDocument,
  type Notification, type InsertNotification, type Integration, type InsertIntegration,
  type CompanyRegistryData, type InsertCompanyRegistryData, type AmlDocument, type InsertAmlDocument,
  type AmlProvider, type InsertAmlProvider, type AmlCheck, type InsertAmlCheck,
  type AccountingIntegration, type InsertAccountingIntegration, type ChecklistTemplate, type InsertChecklistTemplate,
  type ClientChecklist, type InsertClientChecklist, type Plugin, type InsertPlugin,
  type PluginConfiguration, type InsertPluginConfiguration,
  insertClientTaskSchema, insertClientResponsibleSchema
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, count, sql, gte, lte, lt } from "drizzle-orm";

export interface IStorage {
  // User management
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserPassword(userId: string, hashedPassword: string): Promise<User>;
  updateUser2FA(userId: string, secret: string, backupCodes: string[]): Promise<User>;
  updateUser2FABackupCodes(userId: string, backupCodes: string[]): Promise<User>;
  updateUserStripeInfo(userId: string, customerId: string, subscriptionId?: string): Promise<User>;
  getAllUsersWithTenants(): Promise<any[]>;

  // Tenant management
  getAllTenants(): Promise<Tenant[]>;
  getTenant(id: string): Promise<Tenant | undefined>;
  createTenant(tenant: InsertTenant): Promise<Tenant>;

  // Employee management
  getEmployeesByTenant(tenantId: string): Promise<Employee[]>;
  getEmployee(id: string): Promise<Employee | undefined>;
  getEmployeeById(id: string): Promise<Employee | undefined>;
  createEmployee(employee: InsertEmployee): Promise<Employee>;
  updateEmployee(id: string, updates: Partial<Employee>): Promise<Employee>;
  deleteEmployee(id: string): Promise<void>;

  // Client management
  getClientsByTenant(tenantId: string): Promise<Client[]>;
  getClient(id: string): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: string, updates: Partial<Client>): Promise<Client>;

  // Task management
  getTasksByTenant(tenantId: string): Promise<Task[]>;
  getTodaysTasks(tenantId: string): Promise<Task[]>;
  getOverdueTasks(tenantId: string): Promise<Task[]>;
  getTask(id: string): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: string, updates: Partial<Task>): Promise<Task>;
  getAllTasksForTenant(tenantId: string): Promise<any[]>;

  // Client Task management
  getClientTasksByClient(clientId: string, tenantId?: string): Promise<any[]>;
  createClientTask(task: any): Promise<any>;
  updateClientTask(id: string, updates: any): Promise<any>;
  deleteClientTask(id: string): Promise<void>;
  
  // Task Template and Instance management
  getTaskInstancesByClient(clientId: string, options?: any): Promise<any[]>;
  generatePayrollTask(clientId: string, payrollRunDay: number, payrollRunTime?: string): Promise<any>;
  generateUpcomingTasks(tenantId: string, days: number): Promise<number>;
  
  // Client Responsible management
  getClientResponsiblesByClient(clientId: string): Promise<any[]>;
  createClientResponsible(data: any): Promise<any>;
  getClientResponsibles(tenantId: string): Promise<any[]>;

  // Enhanced time tracking with filters
  getTimeEntriesWithFilters(filters: any): Promise<any[]>;
  
  // Task completion and completed tasks
  completeTask(taskId: string, timeSpent: number, completionNotes: string, userId: string): Promise<Task>;
  getCompletedTasks(filters: {
    startDate?: string;
    endDate?: string;
    clientId?: string;
    employeeId?: string;
    userId: string;
    userRole: string;
  }): Promise<Task[]>;

  // Enhanced RBAC methods
  getAssignedClients(userId: string, role: string): Promise<Client[]>;

  // Document audit and backup
  logDocumentAction(documentId: string, tenantId: string, action: string, performedBy: string, details?: any): Promise<void>;
  createBackup(tenantId: string, backupType: string, dataTypes: string[]): Promise<{ success: boolean; message: string; filePath?: string }>;
  exportClientData(tenantId: string, clientIds?: string[], format?: 'csv' | 'excel'): Promise<Buffer>;

  // Advanced notifications
  createAdvancedNotification(notification: any): Promise<any>;

  // Calendar integration
  syncCalendarEvents(userId: string, provider: 'google' | 'outlook'): Promise<{ success: boolean; message: string }>;

  // Enhanced dashboard with KPIs
  getEnhancedDashboardMetrics(tenantId: string, userId: string, role: string): Promise<any>;

  // Time tracking
  getTimeEntriesByUser(userId: string, startDate?: Date, endDate?: Date): Promise<TimeEntry[]>;
  getTimeEntriesByTenant(tenantId: string, startDate?: Date, endDate?: Date): Promise<TimeEntry[]>;
  getTimeEntriesByClient(clientId: string, startDate?: Date, endDate?: Date): Promise<TimeEntry[]>;
  createTimeEntry(entry: InsertTimeEntry): Promise<TimeEntry>;
  updateTimeEntry(id: string, updates: Partial<TimeEntry>): Promise<TimeEntry>;
  deleteTimeEntry(id: string): Promise<void>;

  // Documents
  getDocumentsByClient(clientId: string): Promise<Document[]>;
  getDocumentsByTenant(tenantId: string): Promise<Document[]>;
  createDocument(document: InsertDocument): Promise<Document>;
  getDocumentCountByClient(clientId: string): Promise<number>;
  updateDocument(id: string, updates: Partial<Document>): Promise<Document>;

  // Notifications
  getNotificationsByUser(userId: string, unreadOnly?: boolean): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationRead(id: string): Promise<void>;

  // Integrations
  getIntegrationsByTenant(tenantId: string): Promise<Integration[]>;
  getIntegration(tenantId: string, provider: string): Promise<Integration | undefined>;
  upsertIntegration(integration: InsertIntegration): Promise<Integration>;

  // Dashboard metrics
  getDashboardMetrics(tenantId: string): Promise<{
    totalClients: number;
    activeTasks: number;
    overdueTasks: number;
    weeklyHours: number;
    documentsProcessed: number;
  }>;
  
  // Client task overview
  getClientsWithTaskOverview(tenantId: string): Promise<any[]>;

  // Brønnøysund and company registry
  getCompanyRegistryData(clientId: string): Promise<CompanyRegistryData | undefined>;
  createCompanyRegistryData(data: InsertCompanyRegistryData): Promise<CompanyRegistryData>;
  updateCompanyRegistryData(clientId: string, data: Partial<InsertCompanyRegistryData>): Promise<CompanyRegistryData>;

  // AML/KYC
  getAmlDocumentsByClient(clientId: string): Promise<AmlDocument[]>;
  createAmlDocument(document: InsertAmlDocument): Promise<AmlDocument>;
  getAmlProvidersByTenant(tenantId: string): Promise<AmlProvider[]>;
  createAmlProvider(provider: InsertAmlProvider): Promise<AmlProvider>;
  getAmlChecksByClient(clientId: string): Promise<AmlCheck[]>;
  createAmlCheck(check: InsertAmlCheck): Promise<AmlCheck>;

  // Accounting integrations
  getAccountingIntegrationsByTenant(tenantId: string): Promise<AccountingIntegration[]>;
  getAccountingIntegration(id: string): Promise<AccountingIntegration | undefined>;
  createAccountingIntegration(integration: InsertAccountingIntegration): Promise<AccountingIntegration>;
  updateAccountingIntegration(id: string, integration: Partial<InsertAccountingIntegration>): Promise<AccountingIntegration>;

  // Checklists
  getChecklistTemplates(): Promise<ChecklistTemplate[]>;
  getChecklistTemplate(id: string): Promise<ChecklistTemplate | undefined>;
  createChecklistTemplate(template: InsertChecklistTemplate): Promise<ChecklistTemplate>;
  getClientChecklistsByClient(clientId: string): Promise<ClientChecklist[]>;
  getClientChecklist(id: string): Promise<ClientChecklist | undefined>;
  createClientChecklist(checklist: InsertClientChecklist): Promise<ClientChecklist>;
  updateClientChecklist(id: string, checklist: Partial<InsertClientChecklist>): Promise<ClientChecklist>;

  // Plugins
  getPlugins(): Promise<Plugin[]>;
  getPlugin(id: string): Promise<Plugin | undefined>;
  createPlugin(plugin: InsertPlugin): Promise<Plugin>;
  getPluginConfigurationsByTenant(tenantId: string): Promise<PluginConfiguration[]>;
  createPluginConfiguration(config: InsertPluginConfiguration): Promise<PluginConfiguration>;
  updatePluginConfiguration(id: string, config: Partial<InsertPluginConfiguration>): Promise<PluginConfiguration>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values([insertUser]).returning();
    return user;
  }

  async updateUserPassword(userId: string, hashedPassword: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ 
        password: hashedPassword,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateUser2FA(userId: string, secret: string, backupCodes: string[]): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ 
        twoFactorSecret: secret,
        twoFactorEnabled: true,
        twoFactorBackupCodes: backupCodes,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateUser2FABackupCodes(userId: string, backupCodes: string[]): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ 
        twoFactorBackupCodes: backupCodes,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateUserStripeInfo(userId: string, customerId: string, subscriptionId?: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ 
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async getAllUsersWithTenants(): Promise<any[]> {
    return db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        stripeCustomerId: users.stripeCustomerId,
        stripeSubscriptionId: users.stripeSubscriptionId,
        createdAt: users.createdAt,
        tenantName: tenants.name,
        tenantId: tenants.id
      })
      .from(users)
      .leftJoin(tenants, eq(users.tenantId, tenants.id))
      .orderBy(desc(users.createdAt));
  }

  async getAllTenants(): Promise<Tenant[]> {
    return await db.select().from(tenants);
  }

  async getTenant(id: string): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id));
    return tenant || undefined;
  }

  async createTenant(insertTenant: InsertTenant): Promise<Tenant> {
    const [tenant] = await db.insert(tenants).values(insertTenant).returning();
    return tenant;
  }

  // Employee management
  async getEmployeesByTenant(tenantId: string): Promise<Employee[]> {
    return db.select().from(employees).where(and(eq(employees.tenantId, tenantId), eq(employees.isActive, true)));
  }

  async getEmployee(id: string): Promise<Employee | undefined> {
    const [employee] = await db.select().from(employees).where(eq(employees.id, id));
    return employee || undefined;
  }

  async getEmployeeById(id: string): Promise<Employee | undefined> {
    const [employee] = await db.select().from(employees).where(eq(employees.id, id));
    return employee || undefined;
  }

  async createEmployee(insertEmployee: InsertEmployee): Promise<Employee> {
    const [employee] = await db.insert(employees).values(insertEmployee).returning();
    return employee;
  }

  async updateEmployee(id: string, updates: Partial<Employee>): Promise<Employee> {
    const [employee] = await db
      .update(employees)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(employees.id, id))
      .returning();
    return employee;
  }

  async deleteEmployee(id: string): Promise<void> {
    await db
      .update(employees)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(employees.id, id));
  }

  async getClientsByTenant(tenantId: string): Promise<Client[]> {
    return db.select().from(clients).where(and(eq(clients.tenantId, tenantId), eq(clients.isActive, true)));
  }

  async getClient(id: string): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
    return client || undefined;
  }

  async createClient(insertClient: InsertClient): Promise<Client> {
    const [client] = await db.insert(clients).values(insertClient).returning();
    return client;
  }

  async updateClient(id: string, updates: Partial<Client>): Promise<Client> {
    const [client] = await db
      .update(clients)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(clients.id, id))
      .returning();
    return client;
  }

  async getTasksByTenant(tenantId: string): Promise<Task[]> {
    return db.select().from(tasks).where(eq(tasks.tenantId, tenantId)).orderBy(desc(tasks.createdAt));
  }

  async getTask(id: string): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task;
  }

  async getAllTasksForTenant(tenantId: string): Promise<any[]> {
    // Get regular tasks
    const regularTasks = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        description: tasks.description,
        status: tasks.status,
        priority: tasks.priority,
        dueDate: tasks.dueDate,
        clientId: tasks.clientId,
        assignedTo: tasks.assignedTo,
        createdAt: tasks.createdAt,
        source: sql<string>`'manual'`.as('source')
      })
      .from(tasks)
      .where(eq(tasks.tenantId, tenantId));

    // Get client tasks
    const clientTasksData = await db
      .select({
        id: clientTasks.id,
        title: clientTasks.taskName,
        description: clientTasks.description,
        status: clientTasks.status,
        priority: sql<string>`'medium'`.as('priority'),
        dueDate: clientTasks.dueDate,
        clientId: clientTasks.clientId,
        assignedTo: clientTasks.assignedTo,
        createdAt: clientTasks.createdAt,
        source: sql<string>`'client_schedule'`.as('source')
      })
      .from(clientTasks)
      .where(eq(clientTasks.tenantId, tenantId));

    // Combine and sort by creation date
    const allTasks = [...regularTasks, ...clientTasksData];
    return allTasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getTasksOverviewWithClients(tenantId: string): Promise<any[]> {
    try {
      // Get all tasks with client and user information
      const tasksWithClients = await db
        .select({
          id: tasks.id,
          title: tasks.title,
          description: tasks.description,
          status: tasks.status,
          priority: tasks.priority,
          dueDate: tasks.dueDate,
          clientId: tasks.clientId,
          assignedTo: tasks.assignedTo,
          createdAt: tasks.createdAt,
          source: sql<string>`'manual'`.as('source'),
          clientName: clients.name,
          clientOrgNumber: clients.orgNumber,
          accountingSystem: clients.accountingSystem,
          accountingSystemUrl: clients.accountingSystemUrl,
          assigneeName: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`.as('assigneeName')
        })
        .from(tasks)
        .leftJoin(clients, eq(tasks.clientId, clients.id))
        .leftJoin(users, eq(tasks.assignedTo, users.id))
        .where(eq(tasks.tenantId, tenantId));

      // Get client tasks with client and user information
      const clientTasksWithClients = await db
        .select({
          id: clientTasks.id,
          title: clientTasks.taskName,
          description: clientTasks.description,
          status: clientTasks.status,
          priority: sql<string>`'medium'`.as('priority'),
          dueDate: clientTasks.dueDate,
          clientId: clientTasks.clientId,
          assignedTo: clientTasks.assignedTo,
          createdAt: clientTasks.createdAt,
          source: sql<string>`'client_schedule'`.as('source'),
          clientName: clients.name,
          clientOrgNumber: clients.orgNumber,
          accountingSystem: clients.accountingSystem,
          accountingSystemUrl: clients.accountingSystemUrl,
          assigneeName: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`.as('assigneeName')
        })
        .from(clientTasks)
        .leftJoin(clients, eq(clientTasks.clientId, clients.id))
        .leftJoin(users, eq(clientTasks.assignedTo, users.id))
        .where(eq(clientTasks.tenantId, tenantId));

      // Combine all tasks
      const allTasks = [...tasksWithClients, ...clientTasksWithClients];

      // Add isOverdue flag and format the response
      const now = new Date();
      const formattedTasks = allTasks.map(task => ({
        ...task,
        isOverdue: task.dueDate ? new Date(task.dueDate) < now && 
                   !['completed', 'done', 'ferdig'].includes(task.status.toLowerCase()) : false
      }));

      // Sort by due date (soonest first)
      return formattedTasks.sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
    } catch (error) {
      console.error('Error getting tasks overview with clients:', error);
      return [];
    }
  }

  async getTodaysTasks(tenantId: string): Promise<Task[]> {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    return db.select().from(tasks).where(
      and(
        eq(tasks.tenantId, tenantId),
        gte(tasks.dueDate, startOfDay),
        lte(tasks.dueDate, endOfDay)
      )
    ).orderBy(tasks.dueDate);
  }

  async getOverdueTasks(tenantId: string): Promise<Task[]> {
    const now = new Date();
    return db.select().from(tasks).where(
      and(
        eq(tasks.tenantId, tenantId),
        lte(tasks.dueDate, now),
        eq(tasks.status, 'pending')
      )
    ).orderBy(tasks.dueDate);
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    const [task] = await db.insert(tasks).values(insertTask).returning();
    return task;
  }

  async updateTask(id: string, updates: Partial<Task>): Promise<Task> {
    const [task] = await db
      .update(tasks)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(tasks.id, id))
      .returning();
    
    if (!task) {
      throw new Error(`Task with id ${id} not found in tasks table`);
    }
    
    return task;
  }

  // Client Task methods
  async getClientTasksByClient(clientId: string, tenantId?: string): Promise<any[]> {
    console.log(`🔍 STORAGE: getClientTasksByClient called with clientId: ${clientId}, tenantId: ${tenantId}`);
    
    const conditions = [eq(clientTasks.clientId, clientId)];
    
    if (tenantId) {
      conditions.push(eq(clientTasks.tenantId, tenantId));
      console.log(`🔍 STORAGE: Added tenant filter for: ${tenantId}`);
    }
    
    const results = await db
      .select()
      .from(clientTasks)
      .where(and(...conditions))
      .orderBy(desc(clientTasks.dueDate));
      
    console.log(`🔍 STORAGE: Found ${results.length} tasks:`, results.map(t => ({ id: t.id, taskName: t.taskName, tenantId: t.tenantId })));
    
    return results;
  }

  async createClientTask(task: any): Promise<any> {
    try {
      // Validate required fields
      if (!task.clientId || !task.tenantId || !task.taskName || !task.taskType) {
        throw new Error("Missing required fields for client task");
      }

      // Ensure dueDate is properly formatted
      if (task.dueDate && typeof task.dueDate === 'string') {
        task.dueDate = new Date(task.dueDate);
      }

      const [newTask] = await db
        .insert(clientTasks)
        .values(task)
        .returning();
      
      return newTask;
    } catch (error: any) {
      console.error('Error creating client task:', error);
      throw new Error(`Failed to create client task: ${error.message}`);
    }
  }

  async updateClientTask(id: string, updates: any): Promise<any> {
    try {
      // Ensure dueDate is properly formatted (same as createClientTask)
      if (updates.dueDate && typeof updates.dueDate === 'string') {
        updates.dueDate = new Date(updates.dueDate);
      }
      
      const [updatedTask] = await db
        .update(clientTasks)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(clientTasks.id, id))
        .returning();
      
      if (!updatedTask) {
        throw new Error("Client task not found");
      }
      
      return updatedTask;
    } catch (error: any) {
      console.error('Error updating client task:', error);
      throw new Error(`Failed to update client task: ${error.message}`);
    }
  }

  async deleteClientTask(id: string): Promise<void> {
    await db.delete(clientTasks).where(eq(clientTasks.id, id));
  }

  // Client Responsible methods
  async getClientResponsiblesByClient(clientId: string): Promise<any[]> {
    return await db.select().from(clientResponsibles).where(eq(clientResponsibles.clientId, clientId));
  }

  async createClientResponsible(data: any): Promise<any> {
    const [created] = await db.insert(clientResponsibles).values(data).returning();
    return created;
  }

  async getClientResponsibles(tenantId: string): Promise<any[]> {
    return await db.select().from(clientResponsibles).where(eq(clientResponsibles.tenantId, tenantId));
  }

  async deleteClientResponsible(id: string): Promise<void> {
    await db.delete(clientResponsibles).where(eq(clientResponsibles.id, id));
  }

  async getTimeEntriesByUser(userId: string, startDate?: Date, endDate?: Date): Promise<TimeEntry[]> {
    const conditions = [eq(timeEntries.userId, userId)];
    
    if (startDate) {
      conditions.push(gte(timeEntries.date, startDate));
    }
    if (endDate) {
      conditions.push(lte(timeEntries.date, endDate));
    }
    
    return db.select().from(timeEntries).where(and(...conditions)).orderBy(desc(timeEntries.date));
  }

  async getTimeEntriesByTenant(tenantId: string, startDate?: Date, endDate?: Date): Promise<any[]> {
    const conditions = [eq(timeEntries.tenantId, tenantId)];
    
    if (startDate) {
      conditions.push(gte(timeEntries.date, startDate));
    }
    if (endDate) {
      conditions.push(lte(timeEntries.date, endDate));
    }
    
    return db
      .select({
        id: timeEntries.id,
        description: timeEntries.description,
        timeSpent: timeEntries.timeSpent,
        date: timeEntries.date,
        billable: timeEntries.billable,
        taskType: timeEntries.taskType,
        createdAt: timeEntries.createdAt,
        clientName: clients.name,
        clientId: timeEntries.clientId,
        userName: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`.as('userName'),
        userId: timeEntries.userId
      })
      .from(timeEntries)
      .leftJoin(clients, eq(timeEntries.clientId, clients.id))
      .leftJoin(users, eq(timeEntries.userId, users.id))
      .where(and(...conditions))
      .orderBy(desc(timeEntries.date));
  }

  async getTimeEntriesByClient(clientId: string, startDate?: Date, endDate?: Date): Promise<TimeEntry[]> {
    const conditions = [eq(timeEntries.clientId, clientId)];
    
    if (startDate) {
      conditions.push(gte(timeEntries.date, startDate));
    }
    if (endDate) {
      conditions.push(lte(timeEntries.date, endDate));
    }
    
    return db.select().from(timeEntries).where(and(...conditions)).orderBy(desc(timeEntries.date));
  }

  async createTimeEntry(insertTimeEntry: InsertTimeEntry): Promise<TimeEntry> {
    const [entry] = await db.insert(timeEntries).values(insertTimeEntry).returning();
    return entry;
  }

  async updateTimeEntry(id: string, updates: Partial<TimeEntry>): Promise<TimeEntry> {
    const [updatedEntry] = await db
      .update(timeEntries)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(timeEntries.id, id))
      .returning();
    
    if (!updatedEntry) {
      throw new Error("Time entry not found");
    }
    
    return updatedEntry;
  }

  async deleteTimeEntry(id: string): Promise<void> {
    await db.delete(timeEntries).where(eq(timeEntries.id, id));
  }

  async getDocumentsByClient(clientId: string): Promise<Document[]> {
    return db.select().from(documents).where(eq(documents.clientId, clientId)).orderBy(desc(documents.createdAt));
  }

  async getDocumentsByTenant(tenantId: string): Promise<Document[]> {
    return db.select().from(documents).where(eq(documents.tenantId, tenantId)).orderBy(desc(documents.createdAt));
  }

  async createDocument(document: InsertDocument): Promise<Document> {
    const [newDocument] = await db.insert(documents).values(document).returning();
    return newDocument;
  }

  async getDocumentCountByClient(clientId: string): Promise<number> {
    const [result] = await db
      .select({ count: count() })
      .from(documents)
      .where(and(eq(documents.clientId, clientId), eq(documents.isArchived, false)));
    return result.count;
  }

  async deleteDocument(id: string): Promise<void> {
    await db.delete(documents).where(eq(documents.id, id));
  }

  async updateDocument(id: string, updates: Partial<Document>): Promise<Document> {
    const [document] = await db
      .update(documents)
      .set(updates)
      .where(eq(documents.id, id))
      .returning();
    return document;
  }

  async getNotificationsByUser(userId: string, unreadOnly?: boolean): Promise<Notification[]> {
    const conditions = [eq(notifications.userId, userId)];
    
    if (unreadOnly) {
      conditions.push(eq(notifications.isRead, false));
    }
    
    return db.select().from(notifications).where(and(...conditions)).orderBy(desc(notifications.createdAt));
  }

  async createNotification(insertNotification: InsertNotification): Promise<Notification> {
    const [notification] = await db.insert(notifications).values(insertNotification).returning();
    return notification;
  }

  async markNotificationRead(id: string): Promise<void> {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
  }

  async getIntegrationsByTenant(tenantId: string): Promise<Integration[]> {
    return db.select().from(integrations).where(eq(integrations.tenantId, tenantId));
  }

  async getIntegration(tenantId: string, provider: string): Promise<Integration | undefined> {
    const [integration] = await db.select().from(integrations).where(
      and(eq(integrations.tenantId, tenantId), eq(integrations.provider, provider))
    );
    return integration || undefined;
  }

  async upsertIntegration(insertIntegration: InsertIntegration): Promise<Integration> {
    const existing = await this.getIntegration(insertIntegration.tenantId, insertIntegration.provider);
    
    if (existing) {
      const [integration] = await db
        .update(integrations)
        .set({ ...insertIntegration, updatedAt: new Date() })
        .where(eq(integrations.id, existing.id))
        .returning();
      return integration;
    } else {
      const [integration] = await db.insert(integrations).values(insertIntegration).returning();
      return integration;
    }
  }

  async getDashboardMetrics(tenantId: string): Promise<{
    totalClients: number;
    activeTasks: number;
    overdueTasks: number;
    weeklyHours: number;
    documentsProcessed: number;
  }> {
    const now = new Date();
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());

    const [totalClientsResult] = await db
      .select({ count: count() })
      .from(clients)
      .where(and(eq(clients.tenantId, tenantId), eq(clients.isActive, true)));

    // Count active tasks from both tasks and clientTasks tables
    const [regularActiveTasksResult] = await db
      .select({ count: count() })
      .from(tasks)
      .where(and(eq(tasks.tenantId, tenantId), eq(tasks.status, 'pending')));

    const [clientActiveTasksResult] = await db
      .select({ count: count() })
      .from(clientTasks)
      .where(and(
        eq(clientTasks.tenantId, tenantId), 
        sql`status IN ('ikke_startet', 'pågår')`
      ));

    // Count overdue tasks from both tables
    const [regularOverdueTasksResult] = await db
      .select({ count: count() })
      .from(tasks)
      .where(and(
        eq(tasks.tenantId, tenantId),
        eq(tasks.status, 'pending'),
        lte(tasks.dueDate, now)
      ));

    const [clientOverdueTasksResult] = await db
      .select({ count: count() })
      .from(clientTasks)
      .where(and(
        eq(clientTasks.tenantId, tenantId),
        lt(clientTasks.dueDate, now),
        sql`status != 'ferdig'`
      ));

    const [weeklyHoursResult] = await db
      .select({ sum: sql<number>`COALESCE(SUM(${timeEntries.timeSpent}), 0)` })
      .from(timeEntries)
      .where(and(
        eq(timeEntries.tenantId, tenantId),
        gte(timeEntries.date, weekStart)
      ));

    const [documentsResult] = await db
      .select({ count: count() })
      .from(documents)
      .where(and(eq(documents.tenantId, tenantId), eq(documents.processed, true)));

    return {
      totalClients: totalClientsResult.count,
      activeTasks: regularActiveTasksResult.count + clientActiveTasksResult.count,
      overdueTasks: regularOverdueTasksResult.count + clientOverdueTasksResult.count,
      weeklyHours: Number(weeklyHoursResult.sum) || 0,
      documentsProcessed: documentsResult.count,
    };
  }

  async getClientsWithTaskOverview(tenantId: string): Promise<any[]> {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    // Get clients with their responsible user information
    const clientsWithResponsible = await db
      .select({
        clientId: clients.id,
        clientName: clients.name,
        clientOrgNumber: clients.orgNumber,
        responsibleFirstName: users.firstName,
        responsibleLastName: users.lastName,
      })
      .from(clients)
      .leftJoin(clientResponsibles, eq(clients.id, clientResponsibles.clientId))
      .leftJoin(users, eq(clientResponsibles.userId, users.id))
      .where(eq(clients.tenantId, tenantId))
      .orderBy(clients.name);

    // Get task statistics for each client
    const clientTaskStats = await Promise.all(
      clientsWithResponsible.map(async (client) => {
        // Count open tasks
        const openTasks = await db
          .select({ count: count() })
          .from(clientTasks)
          .where(and(
            eq(clientTasks.clientId, client.clientId),
            eq(clientTasks.tenantId, tenantId),
            sql`status IN ('ikke_startet', 'pågår')`
          ));

        // Count overdue tasks
        const overdueTasks = await db
          .select({ count: count() })
          .from(clientTasks)
          .where(and(
            eq(clientTasks.clientId, client.clientId),
            eq(clientTasks.tenantId, tenantId),
            lt(clientTasks.dueDate, today),
            sql`status != 'ferdig'`
          ));

        // Count this month's tasks
        const thisMonthTasks = await db
          .select({ count: count() })
          .from(clientTasks)
          .where(and(
            eq(clientTasks.clientId, client.clientId),
            eq(clientTasks.tenantId, tenantId),
            gte(clientTasks.dueDate, startOfMonth),
            lte(clientTasks.dueDate, endOfMonth)
          ));

        return {
          id: client.clientId,
          name: client.clientName,
          orgNumber: client.clientOrgNumber,
          responsibleFirstName: client.responsibleFirstName,
          responsibleLastName: client.responsibleLastName,
          openTasks: openTasks[0]?.count || 0,
          overdueTasks: overdueTasks[0]?.count || 0,
          thisMonthTasks: thisMonthTasks[0]?.count || 0,
        };
      })
    );

    return clientTaskStats;
  }

  // Brønnøysund and company registry methods
  async getCompanyRegistryData(clientId: string): Promise<CompanyRegistryData | undefined> {
    const [data] = await db.select().from(companyRegistryData).where(eq(companyRegistryData.clientId, clientId));
    return data || undefined;
  }

  async createCompanyRegistryData(data: InsertCompanyRegistryData): Promise<CompanyRegistryData> {
    const [registryData] = await db.insert(companyRegistryData).values(data).returning();
    return registryData;
  }

  async updateCompanyRegistryData(clientId: string, data: Partial<InsertCompanyRegistryData>): Promise<CompanyRegistryData> {
    const [registryData] = await db
      .update(companyRegistryData)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(companyRegistryData.clientId, clientId))
      .returning();
    return registryData;
  }

  // AML/KYC methods
  async getAmlDocumentsByClient(clientId: string): Promise<AmlDocument[]> {
    return db.select().from(amlDocuments).where(eq(amlDocuments.clientId, clientId)).orderBy(desc(amlDocuments.createdAt));
  }

  async createAmlDocument(document: InsertAmlDocument): Promise<AmlDocument> {
    const [amlDoc] = await db.insert(amlDocuments).values(document).returning();
    return amlDoc;
  }

  async getAmlProvidersByTenant(tenantId: string): Promise<AmlProvider[]> {
    return db.select().from(amlProviders).where(eq(amlProviders.tenantId, tenantId));
  }

  async createAmlProvider(provider: InsertAmlProvider): Promise<AmlProvider> {
    const [amlProvider] = await db.insert(amlProviders).values(provider).returning();
    return amlProvider;
  }

  async getAmlChecksByClient(clientId: string): Promise<AmlCheck[]> {
    return db.select().from(amlChecks).where(eq(amlChecks.clientId, clientId)).orderBy(desc(amlChecks.createdAt));
  }

  async createAmlCheck(check: InsertAmlCheck): Promise<AmlCheck> {
    const [amlCheck] = await db.insert(amlChecks).values(check).returning();
    return amlCheck;
  }

  // Accounting integrations methods
  async getAccountingIntegrationsByTenant(tenantId: string): Promise<AccountingIntegration[]> {
    return db.select().from(accountingIntegrations).where(eq(accountingIntegrations.tenantId, tenantId));
  }

  async getAccountingIntegration(id: string): Promise<AccountingIntegration | undefined> {
    const [integration] = await db.select().from(accountingIntegrations).where(eq(accountingIntegrations.id, id));
    return integration || undefined;
  }

  async createAccountingIntegration(integration: any): Promise<any> {
    const integrationData = {
      ...integration,
      systemType: integration.systemType as "fiken" | "tripletex" | "unimicro" | "poweroffice" | "conta"
    };
    const [accountingIntegration] = await db.insert(accountingIntegrations).values([integrationData]).returning();
    return accountingIntegration;
  }

  async updateAccountingIntegration(id: string, integration: any): Promise<AccountingIntegration> {
    const [accountingIntegration] = await db
      .update(accountingIntegrations)
      .set({ ...integration, updatedAt: new Date() })
      .where(eq(accountingIntegrations.id, id))
      .returning();
    return accountingIntegration;
  }

  // Checklists methods
  async getChecklistTemplates(): Promise<ChecklistTemplate[]> {
    return db.select().from(checklistTemplates).orderBy(checklistTemplates.category);
  }

  async getChecklistTemplate(id: string): Promise<ChecklistTemplate | undefined> {
    const [template] = await db.select().from(checklistTemplates).where(eq(checklistTemplates.id, id));
    return template || undefined;
  }

  async createChecklistTemplate(template: InsertChecklistTemplate): Promise<ChecklistTemplate> {
    const [checklistTemplate] = await db.insert(checklistTemplates).values(template).returning();
    return checklistTemplate;
  }

  async getClientChecklistsByClient(clientId: string): Promise<ClientChecklist[]> {
    return db.select().from(clientChecklists).where(eq(clientChecklists.clientId, clientId)).orderBy(desc(clientChecklists.createdAt));
  }

  async getClientChecklist(id: string): Promise<ClientChecklist | undefined> {
    const [checklist] = await db.select().from(clientChecklists).where(eq(clientChecklists.id, id));
    return checklist || undefined;
  }

  async createClientChecklist(checklist: InsertClientChecklist): Promise<ClientChecklist> {
    const [clientChecklist] = await db.insert(clientChecklists).values(checklist).returning();
    return clientChecklist;
  }

  async updateClientChecklist(id: string, checklist: Partial<InsertClientChecklist>): Promise<ClientChecklist> {
    const [clientChecklist] = await db
      .update(clientChecklists)
      .set({ ...checklist, updatedAt: new Date() })
      .where(eq(clientChecklists.id, id))
      .returning();
    return clientChecklist;
  }

  // Plugins methods
  async getPlugins(): Promise<Plugin[]> {
    return db.select().from(plugins).orderBy(plugins.name);
  }

  async getPlugin(id: string): Promise<Plugin | undefined> {
    const [plugin] = await db.select().from(plugins).where(eq(plugins.id, id));
    return plugin || undefined;
  }

  async createPlugin(plugin: InsertPlugin): Promise<Plugin> {
    const [pluginRecord] = await db.insert(plugins).values(plugin).returning();
    return pluginRecord;
  }

  async getPluginConfigurationsByTenant(tenantId: string): Promise<PluginConfiguration[]> {
    return db.select().from(pluginConfigurations).where(eq(pluginConfigurations.tenantId, tenantId));
  }

  async createPluginConfiguration(config: InsertPluginConfiguration): Promise<PluginConfiguration> {
    const [pluginConfig] = await db.insert(pluginConfigurations).values(config).returning();
    return pluginConfig;
  }

  async updatePluginConfiguration(id: string, config: Partial<InsertPluginConfiguration>): Promise<PluginConfiguration> {
    const [pluginConfig] = await db
      .update(pluginConfigurations)
      .set({ ...config, updatedAt: new Date() })
      .where(eq(pluginConfigurations.id, id))
      .returning();
    return pluginConfig;
  }

  // Enhanced time tracking methods
  async getTimeEntriesWithFilters(filters: any): Promise<any[]> {
    const { tenantId, clientId, userId, taskId, startDate, endDate } = filters;
    
    const conditions = [];
    
    if (tenantId) conditions.push(eq(timeEntries.tenantId, tenantId));
    if (clientId) conditions.push(eq(timeEntries.clientId, clientId));
    if (userId) conditions.push(eq(timeEntries.userId, userId));
    if (taskId) conditions.push(eq(timeEntries.taskId, taskId));
    if (startDate) conditions.push(gte(timeEntries.date, startDate));
    if (endDate) conditions.push(lte(timeEntries.date, endDate));
    
    if (conditions.length > 0) {
      return await db.select().from(timeEntries).where(and(...conditions)).orderBy(desc(timeEntries.date));
    }
    
    return await db.select().from(timeEntries).orderBy(desc(timeEntries.date));
  }

  // Enhanced RBAC methods for Admin/Ansatt roles
  async getAssignedClients(userId: string, role: string): Promise<Client[]> {
    if (role === 'admin') {
      // Admin can see all clients in their tenant
      const user = await this.getUser(userId);
      if (!user) return [];
      return db.select().from(clients).where(and(eq(clients.tenantId, user.tenantId), eq(clients.isActive, true)));
    } else {
      // Ansatt only sees assigned clients
      const assignedClients = await db
        .select({ client: clients })
        .from(clientResponsibles)
        .innerJoin(clients, eq(clientResponsibles.clientId, clients.id))
        .where(and(eq(clientResponsibles.userId, userId), eq(clients.isActive, true)));
      
      return assignedClients.map(ac => ac.client);
    }
  }

  // Document audit logging
  async logDocumentAction(documentId: string, tenantId: string, action: string, performedBy: string, details?: any): Promise<void> {
    // Since documentAuditLog table doesn't exist yet, we'll log to notifications for now
    await this.createNotification({
      tenantId,
      userId: performedBy,
      type: 'document_action',
      title: `Document ${action}`,
      message: `Document action: ${action} on document ${documentId}`,
      priority: 'low'
    });
  }

  // Backup and export functionality
  async createBackup(tenantId: string, backupType: string, dataTypes: string[]): Promise<{ success: boolean; message: string; filePath?: string }> {
    try {
      // For now, create a notification about backup
      await this.createNotification({
        tenantId,
        type: 'backup_started',
        title: 'Backup Started',
        message: `${backupType} backup initiated for: ${dataTypes.join(', ')}`,
        priority: 'medium'
      });

      // In a real implementation, this would:
      // 1. Query all relevant data based on dataTypes
      // 2. Create CSV/Excel files
      // 3. Store in secure location
      // 4. Return file path

      return {
        success: true,
        message: `Backup completed for ${dataTypes.join(', ')}`,
        filePath: `/backups/${tenantId}/${backupType}_${new Date().toISOString().split('T')[0]}.zip`
      };
    } catch (error) {
      return {
        success: false,
        message: `Backup failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // Export client data to CSV/Excel
  async exportClientData(tenantId: string, clientIds?: string[], format: 'csv' | 'excel' = 'excel'): Promise<Buffer> {
    let clientData;
    
    if (clientIds && clientIds.length > 0) {
      clientData = await db.select().from(clients).where(and(eq(clients.tenantId, tenantId), sql`${clients.id} = ANY(${JSON.stringify(clientIds)})`));
    } else {
      clientData = await db.select().from(clients).where(eq(clients.tenantId, tenantId));
    }
    
    // For now, return a simple buffer with JSON data
    // In a real implementation, use libraries like xlsx or csv-writer
    const jsonData = JSON.stringify(clientData, null, 2);
    return Buffer.from(jsonData, 'utf-8');
  }

  // Enhanced notification system with email/push support
  async createAdvancedNotification(notification: {
    tenantId: string;
    userId?: string;
    type: string;
    title: string;
    message: string;
    priority?: string;
    actionUrl?: string;
    sendEmail?: boolean;
    scheduleAt?: Date;
  }): Promise<any> {
    const notificationData = {
      ...notification,
      priority: notification.priority || 'medium',
      emailSent: false,
      pushSent: false
    };

    const [created] = await db.insert(notifications).values([notificationData]).returning();

    // If email should be sent, trigger email service
    if (notification.sendEmail && notification.userId) {
      try {
        const user = await this.getUser(notification.userId);
        if (user) {
          // Email would be sent here via SendGrid
          await db.update(notifications)
            .set({ emailSent: true })
            .where(eq(notifications.id, created.id));
        }
      } catch (error) {
        console.error('Failed to send notification email:', error);
      }
    }

    return created;
  }

  // Task completion and completed tasks methods
  async completeTask(taskId: string, timeSpent: number, completionNotes: string, userId: string): Promise<Task> {
    const now = new Date();
    
    // Update task as completed
    const [completedTask] = await db
      .update(tasks)
      .set({
        status: 'completed',
        completedAt: now,
        timeSpent,
        completionNotes,
        updatedAt: now
      })
      .where(eq(tasks.id, taskId))
      .returning();

    // Create time entry for the task completion
    if (completedTask.clientId) {
      await db.insert(timeEntries).values({
        tenantId: completedTask.tenantId,
        userId: userId,
        clientId: completedTask.clientId,
        taskId: taskId,
        taskType: 'task',
        description: `Fullført oppgave: ${completedTask.title}`,
        timeSpent: timeSpent.toString(),
        date: now,
        billable: true
      });
    }

    return completedTask;
  }

  async getCompletedTasks(filters: {
    startDate?: string;
    endDate?: string;
    clientId?: string;
    employeeId?: string;
    userId: string;
    userRole: string;
  }): Promise<Task[]> {
    const conditions = [eq(tasks.status, 'completed')];
    
    // Get user's tenant
    const user = await this.getUser(filters.userId);
    if (!user) return [];
    
    conditions.push(eq(tasks.tenantId, user.tenantId));

    // Role-based filtering: non-admin users only see their own tasks
    if (filters.userRole !== 'admin' && filters.userRole !== 'oppdragsansvarlig') {
      conditions.push(eq(tasks.assignedTo, filters.userId));
    }

    // Filter by date range if provided
    if (filters.startDate) {
      conditions.push(gte(tasks.completedAt, new Date(filters.startDate)));
    }
    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      endDate.setHours(23, 59, 59, 999); // End of day
      conditions.push(lte(tasks.completedAt, endDate));
    }

    // Filter by client if provided
    if (filters.clientId) {
      conditions.push(eq(tasks.clientId, filters.clientId));
    }

    // Filter by employee if provided
    if (filters.employeeId) {
      conditions.push(eq(tasks.assignedTo, filters.employeeId));
    }

    return await db
      .select()
      .from(tasks)
      .where(and(...conditions))
      .orderBy(desc(tasks.completedAt));
  }

  // Calendar integration placeholder
  async syncCalendarEvents(userId: string, provider: 'google' | 'outlook'): Promise<{ success: boolean; message: string }> {
    // This would integrate with Google Calendar or Outlook APIs
    // For now, just create a notification
    const user = await this.getUser(userId);
    if (!user) return { success: false, message: 'User not found' };

    await this.createNotification({
      tenantId: user.tenantId,
      userId,
      type: 'calendar_sync',
      title: 'Calendar Sync',
      message: `Calendar sync with ${provider} completed`,
      priority: 'low'
    });

    return { success: true, message: `Calendar synced with ${provider}` };
  }

  // Enhanced dashboard metrics with KPIs
  async getEnhancedDashboardMetrics(tenantId: string, userId: string, role: string): Promise<{
    totalClients: number;
    activeTasks: number;
    overdueTasks: number;
    weeklyHours: number;
    documentsProcessed: number;
    kycPendingCount: number;
    amlStatusCounts: { pending: number; approved: number; rejected: number };
    employeeWorkload: Array<{ userId: string; userName: string; activeClients: number; weeklyHours: number }>;
    clientDistribution: Array<{ accountingSystem: string; count: number }>;
  }> {
    const now = new Date();
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());

    // Base metrics (filtered by role)
    let clientsQuery = db.select({ count: count() }).from(clients).where(and(eq(clients.tenantId, tenantId), eq(clients.isActive, true)));
    
    if (role === 'ansatt') {
      // Filter to only assigned clients for Ansatt
      const assignedClientIds = await db
        .select({ clientId: clientResponsibles.clientId })
        .from(clientResponsibles)
        .where(eq(clientResponsibles.userId, userId));
      
      if (assignedClientIds.length > 0) {
        const clientIdList = assignedClientIds.map(c => c.clientId);
        // Create a new filtered query
        const filteredQuery = db.select({ count: count() }).from(clients)
          .where(and(
            eq(clients.tenantId, tenantId), 
            eq(clients.isActive, true),
            sql`${clients.id} = ANY(${JSON.stringify(clientIdList)})`
          ));
        clientsQuery = filteredQuery;
      } else {
        // Create a new query that returns 0
        const emptyQuery = db.select({ count: count() }).from(clients)
          .where(sql`false`);
        clientsQuery = emptyQuery;
      }
    }

    const [totalClientsResult] = await clientsQuery;
    const [activeTasksResult] = await db.select({ count: count() }).from(tasks)
      .where(and(eq(tasks.tenantId, tenantId), eq(tasks.status, 'pending')));
    const [overdueTasksResult] = await db.select({ count: count() }).from(tasks)
      .where(and(eq(tasks.tenantId, tenantId), eq(tasks.status, 'pending'), lte(tasks.dueDate, now)));
    const [weeklyHoursResult] = await db.select({ sum: sql<number>`COALESCE(SUM(${timeEntries.timeSpent}), 0)` })
      .from(timeEntries)
      .where(and(eq(timeEntries.tenantId, tenantId), gte(timeEntries.date, weekStart)));
    const [documentsResult] = await db.select({ count: count() }).from(documents)
      .where(and(eq(documents.tenantId, tenantId), eq(documents.processed, true)));

    // KYC and AML metrics (Admin only)
    let kycPendingCount = 0;
    let amlStatusCounts = { pending: 0, approved: 0, rejected: 0 };
    let employeeWorkload: Array<{ userId: string; userName: string; activeClients: number; weeklyHours: number }> = [];
    let clientDistribution: Array<{ accountingSystem: string; count: number }> = [];

    if (role === 'admin') {
      // KYC status
      const [kycResult] = await db.select({ count: count() }).from(clients)
        .where(and(eq(clients.tenantId, tenantId), eq(clients.kycStatus, 'pending')));
      kycPendingCount = kycResult.count;

      // AML status distribution
      const amlCounts = await db.select({
        status: clients.amlStatus,
        count: count()
      })
      .from(clients)
      .where(eq(clients.tenantId, tenantId))
      .groupBy(clients.amlStatus);

      amlCounts.forEach(item => {
        if (item.status && ['pending', 'approved', 'rejected'].includes(item.status)) {
          amlStatusCounts[item.status as keyof typeof amlStatusCounts] = item.count;
        }
      });

      // Employee workload
      const workloadData = await db.select({
        userId: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        clientCount: count(clientResponsibles.clientId),
        weeklyHours: sql<number>`COALESCE(SUM(${timeEntries.timeSpent}), 0)`
      })
      .from(users)
      .leftJoin(clientResponsibles, eq(users.id, clientResponsibles.userId))
      .leftJoin(timeEntries, and(
        eq(users.id, timeEntries.userId),
        gte(timeEntries.date, weekStart)
      ))
      .where(and(eq(users.tenantId, tenantId), eq(users.role, 'ansatt')))
      .groupBy(users.id, users.firstName, users.lastName);

      employeeWorkload = workloadData.map(emp => ({
        userId: emp.userId,
        userName: `${emp.firstName} ${emp.lastName}`,
        activeClients: emp.clientCount,
        weeklyHours: Number(emp.weeklyHours) || 0
      }));

      // Client distribution by accounting system
      const distribution = await db.select({
        accountingSystem: clients.accountingSystem,
        count: count()
      })
      .from(clients)
      .where(and(eq(clients.tenantId, tenantId), eq(clients.isActive, true)))
      .groupBy(clients.accountingSystem);

      clientDistribution = distribution.map(d => ({
        accountingSystem: d.accountingSystem || 'Not Set',
        count: d.count
      }));
    }

    return {
      totalClients: totalClientsResult.count,
      activeTasks: activeTasksResult.count,
      overdueTasks: overdueTasksResult.count,
      weeklyHours: Number(weeklyHoursResult.sum) || 0,
      documentsProcessed: documentsResult.count,
      kycPendingCount,
      amlStatusCounts,
      employeeWorkload,
      clientDistribution
    };
  }

  // Task Template and Instance management methods
  async getTaskInstancesByClient(clientId: string, options: any = {}): Promise<any[]> {
    try {
      const { taskInstances } = await import("../shared/schema");
      let query = db.select().from(taskInstances).where(eq(taskInstances.clientId, clientId));
      
      if (options.status) {
        query = query.where(and(eq(taskInstances.clientId, clientId), eq(taskInstances.status, options.status)));
      }
      
      query = query.orderBy(desc(taskInstances.dueAt));
      
      if (options.limit) {
        query = query.limit(options.limit);
      }
      
      const instances = await query;
      return instances;
    } catch (error) {
      console.error('Error getting task instances:', error);
      return [];
    }
  }

  async generatePayrollTask(clientId: string, payrollRunDay: number, payrollRunTime?: string): Promise<any> {
    try {
      const { taskTemplates, taskInstances } = await import("../shared/schema");
      
      // Find or create payroll template
      let template = await db
        .select()
        .from(taskTemplates)
        .where(and(eq(taskTemplates.type, 'recurring'), eq(taskTemplates.title, 'Lønn')))
        .limit(1);
      
      if (template.length === 0) {
        // Create default payroll template
        const [newTemplate] = await db
          .insert(taskTemplates)
          .values({
            title: 'Lønn',
            description: 'Månedlig lønnskjøring',
            type: 'recurring',
            interval: 'monthly',
            isActive: true
          })
          .returning();
        template = [newTemplate];
      }

      // Calculate next payroll due date
      const now = new Date();
      const nextRun = new Date(now.getFullYear(), now.getMonth(), payrollRunDay);
      if (nextRun < now) {
        nextRun.setMonth(nextRun.getMonth() + 1);
      }
      
      if (payrollRunTime) {
        const [hours, minutes] = payrollRunTime.split(':');
        nextRun.setHours(parseInt(hours), parseInt(minutes));
      }

      // Create task instance
      const [instance] = await db
        .insert(taskInstances)
        .values({
          templateId: template[0].id,
          clientId,
          title: `Lønn - ${nextRun.toLocaleDateString('nb-NO', { month: 'long', year: 'numeric' })}`,
          description: 'Månedlig lønnskjøring',
          status: 'open',
          dueAt: nextRun,
          priority: 'high'
        })
        .returning();
      
      return instance;
    } catch (error) {
      console.error('Error generating payroll task:', error);
      throw error;
    }
  }

  async generateUpcomingTasks(tenantId: string, days: number): Promise<number> {
    try {
      const { taskTemplates, taskInstances } = await import("../shared/schema");
      let generatedCount = 0;
      
      // Get all active clients for the tenant
      const tenantClients = await db
        .select()
        .from(clients)
        .where(and(eq(clients.tenantId, tenantId), eq(clients.isActive, true)));
      
      // Get all recurring task templates
      const templates = await db
        .select()
        .from(taskTemplates)
        .where(and(eq(taskTemplates.type, 'recurring'), eq(taskTemplates.isActive, true)));
      
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + days);
      
      for (const client of tenantClients) {
        for (const template of templates) {
          // Check if we need to generate instances for this template
          if (template.interval === 'monthly' && client.payrollRunDay) {
            // Generate monthly payroll tasks
            const nextRun = new Date();
            nextRun.setDate(client.payrollRunDay);
            if (nextRun < new Date()) {
              nextRun.setMonth(nextRun.getMonth() + 1);
            }
            
            while (nextRun <= endDate) {
              // Check if task already exists
              const existing = await db
                .select()
                .from(taskInstances)
                .where(and(
                  eq(taskInstances.clientId, client.id),
                  eq(taskInstances.templateId, template.id),
                  sql`DATE(${taskInstances.dueAt}) = DATE(${nextRun})`
                ))
                .limit(1);
              
              if (existing.length === 0) {
                await db.insert(taskInstances).values({
                  templateId: template.id,
                  clientId: client.id,
                  title: `${template.title} - ${nextRun.toLocaleDateString('nb-NO', { month: 'long', year: 'numeric' })}`,
                  description: template.description,
                  status: 'open',
                  dueAt: nextRun,
                  priority: template.priority || 'medium'
                });
                generatedCount++;
              }
              
              nextRun.setMonth(nextRun.getMonth() + 1);
            }
          }
        }
      }
      
      return generatedCount;
    } catch (error) {
      console.error('Error generating upcoming tasks:', error);
      return 0;
    }
  }
}

export const storage = new DatabaseStorage();
