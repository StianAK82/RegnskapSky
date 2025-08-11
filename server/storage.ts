import { 
  users, tenants, clients, tasks, timeEntries, documents, notifications, integrations,
  type User, type InsertUser, type Tenant, type InsertTenant, type Client, type InsertClient,
  type Task, type InsertTask, type TimeEntry, type InsertTimeEntry, type Document, type InsertDocument,
  type Notification, type InsertNotification, type Integration, type InsertIntegration
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

  // Time tracking
  getTimeEntriesByUser(userId: string, startDate?: Date, endDate?: Date): Promise<TimeEntry[]>;
  getTimeEntriesByTenant(tenantId: string, startDate?: Date, endDate?: Date): Promise<TimeEntry[]>;
  createTimeEntry(entry: InsertTimeEntry): Promise<TimeEntry>;

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
    const [user] = await db.insert(users).values(insertUser).returning();
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

  async createTimeEntry(insertTimeEntry: InsertTimeEntry): Promise<TimeEntry> {
    const [entry] = await db.insert(timeEntries).values(insertTimeEntry).returning();
    return entry;
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
      .select({ sum: sql<number>`COALESCE(SUM(${timeEntries.hours}), 0)` })
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
}

export const storage = new DatabaseStorage();
