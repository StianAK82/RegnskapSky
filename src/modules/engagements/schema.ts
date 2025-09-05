import { pgTable, varchar, text, timestamp, integer, boolean, decimal, pgEnum, uuid, jsonb } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import crypto from "crypto";

// Enums for engagement system
export const engagementStatusEnum = pgEnum('engagement_status', ['draft', 'active', 'terminated']);
export const licenseHolderEnum = pgEnum('license_holder', ['client', 'firm']);
export const scopeKeyEnum = pgEnum('scope_key', ['bookkeeping', 'year_end', 'payroll', 'invoicing', 'mva', 'period_reports', 'project', 'other']);
export const frequencyEnum = pgEnum('frequency', ['løpende', 'månedlig', 'kvartalsvis', 'årlig', 'ved_behov']);
export const pricingModelEnum = pgEnum('pricing_model', ['fixed', 'hourly', 'volume']);
export const fixedPeriodEnum = pgEnum('fixed_period', ['monthly', 'quarterly', 'yearly']);

// Enhanced Client table
export const clients = pgTable("clients", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: varchar("name").notNull(),
  orgNumber: varchar("org_number"),
  address: varchar("address"),
  postalAddress: varchar("postal_address"),
  contactName: varchar("contact_person"),
  email: varchar("email"),
  phone: varchar("phone"),
  city: varchar("city"),
  postalCode: varchar("postal_code"),
  municipality: varchar("municipality"),
  responsiblePersonId: uuid("responsible_person_id"),
  engagementOwnerId: uuid("engagement_owner_id"),
  accountingSystem: varchar("accounting_system"),
  accountingSystemUrl: varchar("accounting_system_url"),
  amlStatus: varchar("aml_status"),
  kycStatus: varchar("kyc_status"),
  checklistStatus: varchar("checklist_status"),
  payrollRunDay: integer("payroll_run_day"),
  payrollRunTime: varchar("payroll_run_time"),
  lastBackupDate: timestamp("last_backup_date"),
  isActive: boolean("is_active").default(true),
  notes: text("notes"),
  hourlyReportNotes: text("hourly_report_notes"),
  tasks: jsonb("tasks"),
  recurringTasks: jsonb("recurring_tasks"),
  checklists: jsonb("checklists"),
  amlDocuments: jsonb("aml_documents"),
  calendarIntegration: jsonb("calendar_integration"),
  emailIntegration: jsonb("email_integration"),
  tenantId: uuid("tenant_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Engagement table
export const engagements = pgTable("engagements", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  clientId: varchar("client_id").notNull(),
  status: engagementStatusEnum("status").notNull().default('draft'),
  version: integer("version").default(1),
  validFrom: timestamp("valid_from").notNull(),
  validTo: timestamp("valid_to"),
  systemName: varchar("system_name"),
  licenseHolder: licenseHolderEnum("license_holder"),
  adminAccess: boolean("admin_access").default(false),
  includeStandardTerms: boolean("include_standard_terms").default(true),
  includeDpa: boolean("include_dpa").default(true),
  includeItBilag: boolean("include_it_bilag").default(true),
  tenantId: varchar("tenant_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Signatory table
export const signatories = pgTable("signatories", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  engagementId: varchar("engagement_id").notNull(),
  role: varchar("role").notNull(), // client_representative | responsible_accountant | managing_director
  name: varchar("name").notNull(),
  title: varchar("title"),
  email: varchar("email").notNull(),
  phone: varchar("phone"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Engagement Scope table
export const engagementScopes = pgTable("engagement_scopes", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  engagementId: varchar("engagement_id").notNull(),
  scopeKey: scopeKeyEnum("scope_key").notNull(),
  frequency: frequencyEnum("frequency").notNull(),
  comments: text("comments"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Engagement Pricing table
export const engagementPricing = pgTable("engagement_pricing", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  engagementId: varchar("engagement_id").notNull(),
  area: scopeKeyEnum("area").notNull(),
  model: pricingModelEnum("model").notNull(),
  hourlyRateExVat: decimal("hourly_rate_ex_vat"),
  minTimeUnitMinutes: integer("min_time_unit_minutes").default(15),
  rushMarkupPercent: decimal("rush_markup_percent").default("50"),
  fixedAmountExVat: decimal("fixed_amount_ex_vat"),
  fixedPeriod: fixedPeriodEnum("fixed_period"),
  volumeUnitLabel: varchar("volume_unit_label"),
  volumeUnitPriceExVat: decimal("volume_unit_price_ex_vat"),
  systemCostsNote: text("system_costs_note"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Engagement DPA table
export const engagementDpas = pgTable("engagement_dpas", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  engagementId: varchar("engagement_id").notNull(),
  processorName: varchar("processor_name").notNull(),
  country: varchar("country").notNull(),
  transferBasis: varchar("transfer_basis").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Engagement Checks table
export const engagementChecks = pgTable("engagement_checks", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  engagementId: varchar("engagement_id").notNull(),
  standardTerms: boolean("standard_terms").default(true),
  oppdragsspesifikasjon: boolean("oppdragsspesifikasjon").default(true),
  honorarBetaling: boolean("honorar_betaling").default(true),
  dpa: boolean("dpa").default(true),
  itBilag: boolean("it_bilag").default(true),
  endringsoversikt: boolean("endringsoversikt").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Change Log table
export const changeLogs = pgTable("change_logs", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  engagementId: varchar("engagement_id").notNull(),
  date: timestamp("date").notNull(),
  description: text("description").notNull(),
  attachmentUrl: varchar("attachment_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertClientSchema = createInsertSchema(clients).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

export const insertEngagementSchema = createInsertSchema(engagements).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
}).extend({
  validFrom: z.string().transform((str) => new Date(str)),
  validTo: z.string().optional().transform((str) => str ? new Date(str) : undefined)
});

export const insertSignatorySchema = createInsertSchema(signatories).omit({ 
  id: true, 
  createdAt: true 
});

export const insertEngagementScopeSchema = createInsertSchema(engagementScopes).omit({ 
  id: true, 
  createdAt: true 
});

export const insertEngagementPricingSchema = createInsertSchema(engagementPricing).omit({ 
  id: true, 
  createdAt: true 
});

// Types
export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Engagement = typeof engagements.$inferSelect;
export type InsertEngagement = z.infer<typeof insertEngagementSchema>;
export type Signatory = typeof signatories.$inferSelect;
export type InsertSignatory = z.infer<typeof insertSignatorySchema>;
export type EngagementScope = typeof engagementScopes.$inferSelect;
export type InsertEngagementScope = z.infer<typeof insertEngagementScopeSchema>;
export type EngagementPricing = typeof engagementPricing.$inferSelect;
export type InsertEngagementPricing = z.infer<typeof insertEngagementPricingSchema>;