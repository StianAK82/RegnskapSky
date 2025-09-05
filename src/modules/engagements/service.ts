import { db } from "../../server/db";
import { 
  clients, 
  engagements, 
  signatories, 
  engagementScopes, 
  engagementPricing,
  type Client,
  type InsertClient,
  type Engagement,
  type InsertEngagement
} from "./schema";
import { eq, and } from "drizzle-orm";

export class EngagementService {
  // Client operations
  async createClient(clientData: InsertClient): Promise<Client> {
    const [client] = await db
      .insert(clients)
      .values(clientData)
      .returning();
    return client;
  }

  async getClientsByTenant(tenantId: string): Promise<Client[]> {
    return await db
      .select()
      .from(clients)
      .where(eq(clients.tenantId, tenantId))
      .orderBy(clients.createdAt);
  }

  async getClientById(clientId: string, tenantId: string): Promise<Client | undefined> {
    const [client] = await db
      .select()
      .from(clients)
      .where(
        and(
          eq(clients.id, clientId),
          eq(clients.tenantId, tenantId)
        )
      );
    return client;
  }

  async updateClient(clientId: string, tenantId: string, updates: Partial<InsertClient>): Promise<Client> {
    const [client] = await db
      .update(clients)
      .set({ ...updates, updatedAt: new Date() })
      .where(
        and(
          eq(clients.id, clientId),
          eq(clients.tenantId, tenantId)
        )
      )
      .returning();
    return client;
  }

  // Engagement operations
  async createEngagement(engagementData: InsertEngagement): Promise<Engagement> {
    const [engagement] = await db
      .insert(engagements)
      .values(engagementData)
      .returning();
    return engagement;
  }

  async getEngagementsByClient(clientId: string, tenantId: string): Promise<Engagement[]> {
    return await db
      .select()
      .from(engagements)
      .where(
        and(
          eq(engagements.clientId, clientId),
          eq(engagements.tenantId, tenantId)
        )
      )
      .orderBy(engagements.createdAt);
  }

  async getEngagementById(engagementId: string, tenantId: string): Promise<Engagement | undefined> {
    const [engagement] = await db
      .select()
      .from(engagements)
      .where(
        and(
          eq(engagements.id, engagementId),
          eq(engagements.tenantId, tenantId)
        )
      );
    return engagement;
  }

  async updateEngagement(engagementId: string, tenantId: string, updates: Partial<InsertEngagement>): Promise<Engagement> {
    const [engagement] = await db
      .update(engagements)
      .set({ ...updates, updatedAt: new Date() })
      .where(
        and(
          eq(engagements.id, engagementId),
          eq(engagements.tenantId, tenantId)
        )
      )
      .returning();
    return engagement;
  }

  // Get full engagement details with all related data
  async getEngagementDetails(engagementId: string, tenantId: string) {
    const engagement = await this.getEngagementById(engagementId, tenantId);
    if (!engagement) return null;

    const [engagementSignatories, scopes, pricing] = await Promise.all([
      db.select().from(signatories).where(eq(signatories.engagementId, engagementId)),
      db.select().from(engagementScopes).where(eq(engagementScopes.engagementId, engagementId)),
      db.select().from(engagementPricing).where(eq(engagementPricing.engagementId, engagementId))
    ]);

    return {
      ...engagement,
      signatories: engagementSignatories,
      scopes,
      pricing
    };
  }

  // Get engagement details with client data for view-model
  async getEngagementViewModel(engagementId: string, tenantId: string) {
    const engagement = await this.getEngagementDetails(engagementId, tenantId);
    if (!engagement) return null;

    // Get client data
    const [client] = await db
      .select()
      .from(clients)
      .where(
        and(
          eq(clients.id, engagement.clientId),
          eq(clients.tenantId, tenantId)
        )
      );

    if (!client) return null;

    // Import mapper here to avoid circular dependency
    const { buildEngagementViewModel } = await import('../../../server/modules/engagements/mapper');
    
    return buildEngagementViewModel(engagement, client);
  }

  // Finalize engagement - sets status to active and generates PDFs
  async finalizeEngagement(engagementId: string, tenantId: string) {
    const engagement = await this.getEngagementById(engagementId, tenantId);
    if (!engagement) {
      throw new Error('Engagement not found');
    }

    // Update status to active
    const [updatedEngagement] = await db
      .update(engagements)
      .set({ 
        status: 'active',
        updatedAt: new Date()
      })
      .where(
        and(
          eq(engagements.id, engagementId),
          eq(engagements.tenantId, tenantId)
        )
      )
      .returning();

    // TODO: Generate PDFs here
    const pdfUrls = {
      fullPackage: `/api/engagements/${engagementId}/pdf/full`,
      shortVersion: `/api/engagements/${engagementId}/pdf/short`
    };

    return {
      engagement: updatedEngagement,
      pdfUrls
    };
  }

  // Report methods as specified in requirements
  async getMrrReport(tenantId: string) {
    // Sum fixed pricing per month from active engagements
    const mrrData = await db
      .select({
        month: engagementPricing.fixedPeriod,
        totalMrr: engagementPricing.fixedAmountExVat,
        clientName: clients.legalName,
        engagementId: engagements.id
      })
      .from(engagementPricing)
      .innerJoin(engagements, eq(engagementPricing.engagementId, engagements.id))
      .innerJoin(clients, eq(engagements.clientId, clients.id))
      .where(
        and(
          eq(clients.tenantId, tenantId),
          eq(engagementPricing.model, 'fixed'),
          eq(engagements.status, 'active')
        )
      );

    return mrrData;
  }

  async getHourlyRateDistribution(tenantId: string) {
    // List hourly rates by area, rate, client, engagement
    const rateData = await db
      .select({
        area: engagementPricing.area,
        hourlyRate: engagementPricing.hourlyRateExVat,
        clientName: clients.legalName,
        engagementId: engagements.id
      })
      .from(engagementPricing)
      .innerJoin(engagements, eq(engagementPricing.engagementId, engagements.id))
      .innerJoin(clients, eq(engagements.clientId, clients.id))
      .where(
        and(
          eq(clients.tenantId, tenantId),
          eq(engagementPricing.model, 'hourly'),
          eq(engagements.status, 'active')
        )
      );

    return rateData;
  }

  async getLicenseHolderReport(tenantId: string) {
    // Count license holders (client vs firm)
    const licenseData = await db
      .select({
        licenseHolder: engagements.licenseHolder,
        count: db.select({ count: "1" }).from(engagements)
      })
      .from(engagements)
      .innerJoin(clients, eq(engagements.clientId, clients.id))
      .where(
        and(
          eq(clients.tenantId, tenantId),
          eq(engagements.status, 'active')
        )
      )
      .groupBy(engagements.licenseHolder);

    return licenseData;
  }

  async getTerminationWindowReport(tenantId: string, months: number) {
    // Find engagements within termination window
    const now = new Date();
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + months);

    const terminationData = await db
      .select({
        clientName: clients.legalName,
        engagementId: engagements.id,
        validFrom: engagements.validFrom,
        validTo: engagements.validTo,
        noticeMonths: clients.noticeMonths
      })
      .from(engagements)
      .innerJoin(clients, eq(engagements.clientId, clients.id))
      .where(
        and(
          eq(clients.tenantId, tenantId),
          eq(engagements.status, 'active')
        )
      );

    return terminationData;
  }
}

export const engagementService = new EngagementService();