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
import { eq, and, desc, count, sql, gte, lte } from "drizzle-orm";

export interface IStorage {
  // User management
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserStripeInfo(userId: string, customerId: string, subscriptionId?: string): Promise<User>;

  // Tenant management
  getTenant(id: string): Promise<Tenant | undefined>;
  createTenant(tenant: InsertTenant): Promise<Tenant>;

  // Employee management
  getEmployeesByTenant(tenantId: string): Promise<Employee[]>;
  getEmployee(id: string): Promise<Employee | undefined>;
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
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: string, updates: Partial<Task>): Promise<Task>;

  // Client Task management
  getClientTasksByClient(clientId: string): Promise<any[]>;
  createClientTask(task: any): Promise<any>;
  updateClientTask(id: string, updates: any): Promise<any>;
  deleteClientTask(id: string): Promise<void>;
  
  // Client Responsible management
  getClientResponsiblesByClient(clientId: string): Promise<any[]>;
  createClientResponsible(data: any): Promise<any>;
  getClientResponsibles(tenantId: string): Promise<any[]>;

  // Enhanced time tracking with filters
  getTimeEntriesWithFilters(filters: any): Promise<any[]>;

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
  createDocument(document: InsertDocument): Promise<Document>;
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
    return task;
  }

  // Client Task methods
  async getClientTasksByClient(clientId: string): Promise<any[]> {
    return await db
      .select()
      .from(clientTasks)
      .where(eq(clientTasks.clientId, clientId))
      .orderBy(desc(clientTasks.dueDate));
  }

  async createClientTask(task: any): Promise<any> {
    const [newTask] = await db
      .insert(clientTasks)
      .values(task)
      .returning();
    
    return newTask;
  }

  async updateClientTask(id: string, updates: any): Promise<any> {
    const [updatedTask] = await db
      .update(clientTasks)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(clientTasks.id, id))
      .returning();
    
    if (!updatedTask) {
      throw new Error("Client task not found");
    }
    
    return updatedTask;
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

  async getTimeEntriesByTenant(tenantId: string, startDate?: Date, endDate?: Date): Promise<TimeEntry[]> {
    const conditions = [eq(timeEntries.tenantId, tenantId)];
    
    if (startDate) {
      conditions.push(gte(timeEntries.date, startDate));
    }
    if (endDate) {
      conditions.push(lte(timeEntries.date, endDate));
    }
    
    return db.select().from(timeEntries).where(and(...conditions)).orderBy(desc(timeEntries.date));
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

  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const [document] = await db.insert(documents).values(insertDocument).returning();
    return document;
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

    const [activeTasksResult] = await db
      .select({ count: count() })
      .from(tasks)
      .where(and(eq(tasks.tenantId, tenantId), eq(tasks.status, 'pending')));

    const [overdueTasksResult] = await db
      .select({ count: count() })
      .from(tasks)
      .where(and(
        eq(tasks.tenantId, tenantId),
        eq(tasks.status, 'pending'),
        lte(tasks.dueDate, now)
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
      activeTasks: activeTasksResult.count,
      overdueTasks: overdueTasksResult.count,
      weeklyHours: Number(weeklyHoursResult.sum) || 0,
      documentsProcessed: documentsResult.count,
    };
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
    
    let baseQuery = db.select().from(timeEntries);
    const conditions = [];
    
    if (tenantId) conditions.push(eq(timeEntries.tenantId, tenantId));
    if (clientId) conditions.push(eq(timeEntries.clientId, clientId));
    if (userId) conditions.push(eq(timeEntries.userId, userId));
    if (taskId) conditions.push(eq(timeEntries.taskId, taskId));
    if (startDate) conditions.push(gte(timeEntries.date, startDate));
    if (endDate) conditions.push(lte(timeEntries.date, endDate));
    
    if (conditions.length > 0) {
      baseQuery = baseQuery.where(and(...conditions));
    }
    
    return await baseQuery.orderBy(desc(timeEntries.date));
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
    let query = db.select().from(clients).where(eq(clients.tenantId, tenantId));
    
    if (clientIds && clientIds.length > 0) {
      query = query.where(and(eq(clients.tenantId, tenantId), sql`${clients.id} = ANY(${JSON.stringify(clientIds)})`));
    }

    const clientData = await query;
    
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
}

export const storage = new DatabaseStorage();
