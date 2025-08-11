import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, jsonb, uuid, decimal } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User roles enum
export const userRoles = ["admin", "oppdragsansvarlig", "regnskapsfører", "intern", "lisensadmin"] as const;
export type UserRole = typeof userRoles[number];

// Users table
export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  role: text("role").notNull().$type<UserRole>(),
  tenantId: uuid("tenant_id").notNull(),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tenants (multi-tenant support)
export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  orgNumber: text("org_number"),
  address: text("address"),
  email: text("email"),
  phone: text("phone"),
  subscriptionPlan: text("subscription_plan").default("basic"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Clients
export const clients = pgTable("clients", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull(),
  name: text("name").notNull(),
  orgNumber: text("org_number"),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  contactPerson: text("contact_person"),
  amlStatus: text("aml_status").default("pending"), // pending, approved, rejected
  accountingSystem: text("accounting_system"), // Fiken, Tripletex, Unimicro, PowerOffice, Conta, Annet
  accountingSystemUrl: text("accounting_system_url"), // Custom URL for "Annet"
  notes: text("notes"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Client Responsibles (many-to-many)
export const clientResponsibles = pgTable("client_responsibles", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: uuid("client_id").notNull(),
  userId: uuid("user_id").notNull(),
  tenantId: uuid("tenant_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Client Tasks (enhanced task system)
export const clientTasks = pgTable("client_tasks", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: uuid("client_id").notNull(),
  tenantId: uuid("tenant_id").notNull(),
  taskName: text("task_name").notNull(), // From standard list or custom
  taskType: text("task_type").notNull(), // "standard" or "custom"
  description: text("description"),
  dueDate: timestamp("due_date"),
  repeatInterval: text("repeat_interval"), // daglig, ukentlig, månedlig, årlig
  status: text("status").default("ikke_startet"), // ikke_startet, pågår, ferdig
  assignedTo: uuid("assigned_to"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tasks (existing system)
export const tasks = pgTable("tasks", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull(),
  clientId: uuid("client_id"),
  assignedTo: uuid("assigned_to"),
  title: text("title").notNull(),
  description: text("description"),
  priority: text("priority").default("medium"), // low, medium, high
  status: text("status").default("pending"), // pending, in_progress, completed, overdue
  dueDate: timestamp("due_date"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Time tracking (enhanced)
export const timeEntries = pgTable("time_entries", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull(),
  userId: uuid("user_id").notNull(),
  clientId: uuid("client_id").notNull(),
  taskId: uuid("task_id"), // Can be from tasks or clientTasks
  taskType: text("task_type"), // "task" or "client_task"
  description: text("description").notNull(),
  timeSpent: decimal("time_spent", { precision: 5, scale: 2 }).notNull(), // in hours
  date: timestamp("date").notNull(),
  billable: boolean("billable").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Documents/Bilag
export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull(),
  clientId: uuid("client_id"),
  fileName: text("file_name").notNull(),
  fileType: text("file_type"),
  fileSize: integer("file_size"),
  category: text("category"), // AI categorized
  amount: decimal("amount", { precision: 12, scale: 2 }),
  currency: text("currency").default("NOK"),
  date: timestamp("date"),
  processed: boolean("processed").default(false),
  aiSuggestions: jsonb("ai_suggestions"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Notifications
export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull(),
  userId: uuid("user_id"),
  type: text("type").notNull(), // task_overdue, payment_due, system_error, etc.
  title: text("title").notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false),
  priority: text("priority").default("medium"),
  createdAt: timestamp("created_at").defaultNow(),
});

// API Integration status
export const integrations = pgTable("integrations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull(),
  provider: text("provider").notNull(), // tripletex, fiken, stripe, sendgrid
  isActive: boolean("is_active").default(false),
  lastSync: timestamp("last_sync"),
  status: text("status").default("disconnected"), // connected, disconnected, error
  errorMessage: text("error_message"),
  config: jsonb("config"), // API keys, endpoints, etc.
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});



// AML/KYC Documents
export const amlDocuments = pgTable("aml_documents", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: uuid("client_id").notNull(),
  tenantId: uuid("tenant_id").notNull(),
  documentType: text("document_type").notNull(), // passport, driving_license, company_certificate, etc.
  title: text("title").notNull(),
  filePath: text("file_path").notNull(),
  fileSize: integer("file_size"),
  mimeType: text("mime_type"),
  verificationStatus: text("verification_status").default("pending"), // pending, verified, rejected
  verificationNotes: text("verification_notes"),
  expiryDate: timestamp("expiry_date"),
  issuedBy: text("issued_by"),
  documentNumber: text("document_number"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Company registry data from Brønnøysund
export const companyRegistryData = pgTable("company_registry_data", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: uuid("client_id").notNull().unique(),
  orgNumber: text("org_number").notNull().unique(),
  name: text("name").notNull(),
  businessForm: text("business_form"),
  registrationDate: timestamp("registration_date"),
  address: jsonb("address"), // Full address object
  businessAddress: jsonb("business_address"), // Business address if different
  contactInfo: jsonb("contact_info"), // Phone, email, website
  businessCodes: jsonb("business_codes"), // NACE codes
  sharesInfo: jsonb("shares_info"), // Share capital, ownership
  boardMembers: jsonb("board_members"), // Board and management
  auditInfo: jsonb("audit_info"), // Auditor information
  bankruptcyStatus: text("bankruptcy_status"),
  liquidationStatus: text("liquidation_status"),
  isActive: boolean("is_active").default(true),
  lastSyncAt: timestamp("last_sync_at").defaultNow(),
  rawData: jsonb("raw_data"), // Full API response for reference
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Accounting system integrations (extended)
export const accountingSystemTypes = ["fiken", "tripletex", "unimicro", "poweroffice", "conta"] as const;
export type AccountingSystemType = typeof accountingSystemTypes[number];

export const accountingIntegrations = pgTable("accounting_integrations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull(),
  clientId: uuid("client_id"), // Optional: client-specific integration
  systemType: text("system_type").notNull().$type<AccountingSystemType>(),
  displayName: text("display_name").notNull(),
  apiEndpoint: text("api_endpoint"),
  apiKey: text("api_key"), // Encrypted
  apiSecret: text("api_secret"), // Encrypted
  accessToken: text("access_token"), // Encrypted
  refreshToken: text("refresh_token"), // Encrypted
  companyId: text("company_id"), // Company ID in external system
  connectionStatus: text("connection_status").default("disconnected"), // connected, disconnected, error
  lastSyncAt: timestamp("last_sync_at"),
  syncFrequency: text("sync_frequency").default("daily"), // manual, hourly, daily, weekly
  syncSettings: jsonb("sync_settings"), // Custom sync configuration
  errorLog: jsonb("error_log"), // Recent error messages
  capabilities: jsonb("capabilities"), // What this integration supports
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Regnskap Norge checklists
export const checklistTemplates = pgTable("checklist_templates", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(), // monthly, quarterly, yearly, tax, audit
  accountingStandard: text("accounting_standard").default("regnskap_norge"), // regnskap_norge, ifrs
  applicableBusinessForms: jsonb("applicable_business_forms"), // AS, ASA, ENK, etc.
  items: jsonb("items").notNull(), // Array of checklist items
  autoFillRules: jsonb("auto_fill_rules"), // Rules for automatic filling
  isActive: boolean("is_active").default(true),
  version: text("version").default("1.0"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const clientChecklists = pgTable("client_checklists", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: uuid("client_id").notNull(),
  tenantId: uuid("tenant_id").notNull(),
  templateId: uuid("template_id").notNull(),
  assignedTo: uuid("assigned_to"), // User responsible
  period: text("period").notNull(), // 2024-01, 2024-Q1, 2024, etc.
  status: text("status").default("pending"), // pending, in_progress, completed, overdue
  progress: integer("progress").default(0), // 0-100%
  items: jsonb("items").notNull(), // Checklist items with completion status
  autoFilledAt: timestamp("auto_filled_at"),
  completedAt: timestamp("completed_at"),
  dueDate: timestamp("due_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Plugin system
export const plugins = pgTable("plugins", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  displayName: text("display_name").notNull(),
  description: text("description"),
  version: text("version").notNull(),
  author: text("author"),
  category: text("category"), // integration, report, automation, etc.
  configSchema: jsonb("config_schema"), // JSON schema for plugin configuration
  apiEndpoints: jsonb("api_endpoints"), // API endpoints this plugin provides
  dependencies: jsonb("dependencies"), // Other plugins this depends on
  permissions: jsonb("permissions"), // Required permissions
  isActive: boolean("is_active").default(false),
  isSystemPlugin: boolean("is_system_plugin").default(false),
  installPath: text("install_path"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const pluginConfigurations = pgTable("plugin_configurations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull(),
  pluginId: uuid("plugin_id").notNull(),
  isEnabled: boolean("is_enabled").default(false),
  configuration: jsonb("configuration"), // Plugin-specific configuration
  lastExecuted: timestamp("last_executed"),
  executionLog: jsonb("execution_log"), // Recent execution results
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// AML/KYC External Partner Integration
export const amlProviders = pgTable("aml_providers", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull(),
  providerName: text("provider_name").notNull(), // ComplianceAI, Thomson Reuters, etc.
  apiEndpoint: text("api_endpoint").notNull(),
  apiKey: text("api_key"), // Encrypted
  apiSecret: text("api_secret"), // Encrypted
  isActive: boolean("is_active").default(false),
  supportedChecks: jsonb("supported_checks"), // identity, sanction, pep, etc.
  pricing: jsonb("pricing"), // Cost per check, monthly fees, etc.
  configuration: jsonb("configuration"), // Provider-specific settings
  lastUsed: timestamp("last_used"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const amlChecks = pgTable("aml_checks", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: uuid("client_id").notNull(),
  tenantId: uuid("tenant_id").notNull(),
  providerId: uuid("provider_id"),
  checkType: text("check_type").notNull(), // identity, sanction, pep, adverse_media
  status: text("status").default("pending"), // pending, completed, failed, manual_review
  result: text("result"), // pass, fail, requires_review
  confidence: decimal("confidence", { precision: 5, scale: 2 }), // 0.00-100.00
  findings: jsonb("findings"), // Detailed results from provider
  documentIds: jsonb("document_ids"), // Related documents
  manualReviewNotes: text("manual_review_notes"),
  reviewedBy: uuid("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),
  cost: decimal("cost", { precision: 10, scale: 2 }), // Cost of this check
  externalReferenceId: text("external_reference_id"), // Provider's reference
  rawResponse: jsonb("raw_response"), // Full API response
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [users.tenantId],
    references: [tenants.id],
  }),
  assignedTasks: many(tasks),
  timeEntries: many(timeEntries),
}));

export const tenantsRelations = relations(tenants, ({ many }) => ({
  users: many(users),
  clients: many(clients),
  tasks: many(tasks),
  documents: many(documents),
  notifications: many(notifications),
  integrations: many(integrations),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [clients.tenantId],
    references: [tenants.id],
  }),
  tasks: many(tasks),
  clientTasks: many(clientTasks),
  responsibles: many(clientResponsibles),
  documents: many(documents),
  timeEntries: many(timeEntries),
}));

export const clientTasksRelations = relations(clientTasks, ({ one }) => ({
  client: one(clients, {
    fields: [clientTasks.clientId],
    references: [clients.id],
  }),
  assignedUser: one(users, {
    fields: [clientTasks.assignedTo],
    references: [users.id],
  }),
}));

export const clientResponsiblesRelations = relations(clientResponsibles, ({ one }) => ({
  client: one(clients, {
    fields: [clientResponsibles.clientId],
    references: [clients.id],
  }),
  user: one(users, {
    fields: [clientResponsibles.userId],
    references: [users.id],
  }),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  tenant: one(tenants, {
    fields: [tasks.tenantId],
    references: [tenants.id],
  }),
  client: one(clients, {
    fields: [tasks.clientId],
    references: [clients.id],
  }),
  assignedUser: one(users, {
    fields: [tasks.assignedTo],
    references: [users.id],
  }),
}));

export const timeEntriesRelations = relations(timeEntries, ({ one }) => ({
  tenant: one(tenants, {
    fields: [timeEntries.tenantId],
    references: [tenants.id],
  }),
  user: one(users, {
    fields: [timeEntries.userId],
    references: [users.id],
  }),
  client: one(clients, {
    fields: [timeEntries.clientId],
    references: [clients.id],
  }),
  task: one(tasks, {
    fields: [timeEntries.taskId],
    references: [tasks.id],
  }),
}));

export const documentsRelations = relations(documents, ({ one }) => ({
  tenant: one(tenants, {
    fields: [documents.tenantId],
    references: [tenants.id],
  }),
  client: one(clients, {
    fields: [documents.clientId],
    references: [clients.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  tenant: one(tenants, {
    fields: [notifications.tenantId],
    references: [tenants.id],
  }),
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

export const integrationsRelations = relations(integrations, ({ one }) => ({
  tenant: one(tenants, {
    fields: [integrations.tenantId],
    references: [tenants.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTenantSchema = createInsertSchema(tenants).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertClientTaskSchema = createInsertSchema(clientTasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertClientResponsibleSchema = createInsertSchema(clientResponsibles).omit({
  id: true,
  createdAt: true,
});

export const insertTimeEntrySchema = createInsertSchema(timeEntries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  createdAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export const insertIntegrationSchema = createInsertSchema(integrations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// New module insert schemas
export const insertAmlDocumentSchema = createInsertSchema(amlDocuments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCompanyRegistryDataSchema = createInsertSchema(companyRegistryData).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAccountingIntegrationSchema = createInsertSchema(accountingIntegrations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertChecklistTemplateSchema = createInsertSchema(checklistTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertClientChecklistSchema = createInsertSchema(clientChecklists).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPluginSchema = createInsertSchema(plugins).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPluginConfigurationSchema = createInsertSchema(pluginConfigurations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAmlProviderSchema = createInsertSchema(amlProviders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAmlCheckSchema = createInsertSchema(amlChecks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = z.infer<typeof insertTenantSchema>;
export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type TimeEntry = typeof timeEntries.$inferSelect;
export type InsertTimeEntry = z.infer<typeof insertTimeEntrySchema>;
export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Integration = typeof integrations.$inferSelect;
export type InsertIntegration = z.infer<typeof insertIntegrationSchema>;

// New module types
export type AmlDocument = typeof amlDocuments.$inferSelect;
export type InsertAmlDocument = z.infer<typeof insertAmlDocumentSchema>;
export type CompanyRegistryData = typeof companyRegistryData.$inferSelect;
export type InsertCompanyRegistryData = z.infer<typeof insertCompanyRegistryDataSchema>;
export type AccountingIntegration = typeof accountingIntegrations.$inferSelect;
export type InsertAccountingIntegration = z.infer<typeof insertAccountingIntegrationSchema>;
export type ChecklistTemplate = typeof checklistTemplates.$inferSelect;
export type InsertChecklistTemplate = z.infer<typeof insertChecklistTemplateSchema>;
export type ClientChecklist = typeof clientChecklists.$inferSelect;
export type InsertClientChecklist = z.infer<typeof insertClientChecklistSchema>;
export type Plugin = typeof plugins.$inferSelect;
export type InsertPlugin = z.infer<typeof insertPluginSchema>;
export type PluginConfiguration = typeof pluginConfigurations.$inferSelect;
export type InsertPluginConfiguration = z.infer<typeof insertPluginConfigurationSchema>;
export type AmlProvider = typeof amlProviders.$inferSelect;
export type InsertAmlProvider = z.infer<typeof insertAmlProviderSchema>;
export type AmlCheck = typeof amlChecks.$inferSelect;
export type InsertAmlCheck = z.infer<typeof insertAmlCheckSchema>;
