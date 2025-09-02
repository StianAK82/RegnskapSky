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
}

export const engagementService = new EngagementService();