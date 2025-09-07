import { db } from "../../../server/db";
import { 
  clients, 
  engagements,
  clientTasks,
  employees,
  type Client,
  type InsertClient,
  type Engagement,
  type InsertEngagement
} from "../../../shared/schema";
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
  async createEngagement(engagementData: InsertEngagement & { 
    signatories?: Array<{ role: string; name: string; email: string; phone?: string; title?: string }>;
    scopes?: Array<{ scopeKey: string; frequency: string; comments?: string }>;
    pricing?: Array<any>;
    dpas?: Array<any>;
  }): Promise<Engagement> {
    console.log('🔍 ENGAGEMENT SERVICE: Raw engagement data before processing:', {
      signatories: engagementData.signatories,
      scopes: engagementData.scopes,
      pricing: engagementData.pricing,
      dpas: engagementData.dpas,
      signatoriesType: typeof engagementData.signatories,
      signatoriesLength: engagementData.signatories?.length
    });

    const [engagement] = await db
      .insert(engagements)
      .values({
        id: `eng-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        clientId: engagementData.clientId,
        tenantId: engagementData.tenantId,
        status: engagementData.status || 'draft',
        version: engagementData.version || 1,
        validFrom: engagementData.validFrom,
        systemName: engagementData.systemName,
        licenseHolder: engagementData.licenseHolder || 'client',
        adminAccess: engagementData.adminAccess || false,
        signatories: JSON.stringify(engagementData.signatories || []),
        scopes: JSON.stringify(engagementData.scopes || []),
        pricing: JSON.stringify(engagementData.pricing || []),
        dpas: JSON.stringify(engagementData.dpas || []),
        includeStandardTerms: engagementData.includeStandardTerms || true,
        includeDpa: engagementData.includeDpa || true,
        includeItBilag: engagementData.includeItBilag || true
      })
      .returning();

    console.log('🔧 ENGAGEMENT: Created engagement with embedded data:', { 
      engagementId: engagement.id,
      signatories: engagementData.signatories?.length || 0,
      scopes: engagementData.scopes?.length || 0,
      pricing: engagementData.pricing?.length || 0
    });

    return engagement;
  }


  // Create default tasks based on engagement scopes
  private async createDefaultTasksForEngagement(
    engagementId: string, 
    scopes: Array<{ scopeKey: string; frequency: string; comments?: string }>,
    signatories?: Array<{ role: string; name: string; email: string }>,
    tenantId?: string
  ) {
    if (!tenantId) {
      console.warn('⚠️ TASK AUTOMATION: No tenantId provided, skipping task creation');
      return;
    }

    // Find responsible accountant from signatories
    const responsibleAccountant = signatories?.find(s => s.role === 'responsible_accountant' || s.role === 'accounting_responsible');
    let responsibleUserId: string | null = null;

    if (responsibleAccountant) {
      // Find the user by email to get their ID
      const { db: storageDb } = await import('../../../server/db');
      const { users } = await import('../../../shared/schema');
      const { eq } = await import('drizzle-orm');
      
      const [user] = await storageDb
        .select()
        .from(users)
        .where(eq(users.email, responsibleAccountant.email))
        .limit(1);
      
      if (user) {
        responsibleUserId = user.id;
        console.log('🔧 TASK AUTOMATION: Found responsible user:', { email: responsibleAccountant.email, userId: user.id });
      } else {
        console.warn('⚠️ TASK AUTOMATION: Responsible accountant not found in users table:', responsibleAccountant.email);
      }
    }

    // Import storage for task creation
    const { storage } = await import('../../../server/storage');

    // Task mapping based on scope keys
    const taskTemplates = {
      'bookkeeping': {
        taskName: 'Bokføring',
        description: 'Løpende bokføring av transaksjoner',
        interval: 'monthly'
      },
      'year_end': {
        taskName: 'Årsoppgjør', 
        description: 'Årlig årsoppgjør og skattemelding',
        interval: 'yearly'
      },
      'payroll': {
        taskName: 'Lønn',
        description: 'Månadlig lønnskjøring',
        interval: 'monthly'
      },
      'mva': {
        taskName: 'MVA',
        description: 'Merverdiavgift rapportering',
        interval: 'bi-monthly'
      },
      'period_reports': {
        taskName: 'Perioderapporter',
        description: 'Kvartalsrapporter og oppfølging', 
        interval: 'quarterly'
      }
    };

    const tasksToCreate = [];

    for (const scope of scopes) {
      const template = taskTemplates[scope.scopeKey as keyof typeof taskTemplates];
      if (template) {
        // Calculate due date based on frequency
        const now = new Date();
        let dueDate = new Date(now);
        
        switch (template.interval) {
          case 'monthly':
            dueDate.setMonth(dueDate.getMonth() + 1);
            break;
          case 'bi-monthly':  
            dueDate.setMonth(dueDate.getMonth() + 2);
            break;
          case 'quarterly':
            dueDate.setMonth(dueDate.getMonth() + 3);
            break;
          case 'yearly':
            dueDate.setFullYear(dueDate.getFullYear() + 1);
            break;
        }

        const taskData = {
          clientId: (await this.getEngagementById(engagementId, tenantId))?.clientId,
          tenantId,
          taskName: template.taskName,
          taskType: 'standard',
          description: scope.comments || template.description,
          dueDate: dueDate.toISOString(),
          interval: template.interval,
          repeatInterval: this.getRepeatIntervalText(template.interval),
          status: 'ikke_startet',
          assignedTo: responsibleUserId,
          isManuallyAssigned: false
        };

        tasksToCreate.push(taskData);
      }
    }

    // Create all tasks
    for (const taskData of tasksToCreate) {
      try {
        const task = await storage.createClientTask(taskData);
        console.log('✅ TASK AUTOMATION: Created task:', { taskName: task.taskName, assignedTo: task.assignedTo });
      } catch (error) {
        console.error('❌ TASK AUTOMATION: Failed to create task:', taskData.taskName, error);
      }
    }

    console.log(`🔧 TASK AUTOMATION: Created ${tasksToCreate.length} default tasks for engagement ${engagementId}`);
  }

  private getRepeatIntervalText(interval: string): string {
    const mapping = {
      'monthly': 'Månedlig',
      'bi-monthly': '2 vær mnd', 
      'quarterly': 'Kvartalsvis',
      'yearly': 'Årlig'
    };
    return mapping[interval as keyof typeof mapping] || interval;
  }

  // Sync client responsible to tasks - reassign open standard tasks
  async syncClientResponsibleToTasks(clientId: string, newResponsibleUserId: string): Promise<void> {
    const { storage } = await import('../../../server/storage');
    
    console.log('🔧 SYNC RESPONSIBLE: Syncing tasks for client:', { clientId, newResponsibleUserId });

    try {
      // Get all open standard tasks for the client that are not manually assigned
      const { db: storageDb } = await import('../../../server/db');
      const { clientTasks } = await import('../../../shared/schema');
      const { eq, and } = await import('drizzle-orm');

      const openTasks = await storageDb
        .select()
        .from(clientTasks)
        .where(
          and(
            eq(clientTasks.clientId, clientId),
            eq(clientTasks.taskType, 'standard'),
            eq(clientTasks.status, 'ikke_startet'),
            // eq(clientTasks.isManuallyAssigned, false) // TODO: Add this field to schema
          )
        );

      console.log(`🔧 SYNC RESPONSIBLE: Found ${openTasks.length} tasks to reassign`);

      // Update all matching tasks to the new responsible user
      for (const task of openTasks) {
        await storageDb
          .update(clientTasks)
          .set({ 
            assignedTo: newResponsibleUserId,
            updatedAt: new Date()
          })
          .where(eq(clientTasks.id, task.id));

        console.log('✅ SYNC RESPONSIBLE: Reassigned task:', { taskName: task.taskName, oldAssignee: task.assignedTo, newAssignee: newResponsibleUserId });
      }

    } catch (error) {
      console.error('❌ SYNC RESPONSIBLE: Error syncing tasks:', error);
      throw new Error(`Failed to sync responsible user for client tasks: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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

  // Get full engagement details with all related data (JSONB version)
  async getEngagementDetails(engagementId: string, tenantId: string) {
    const engagement = await this.getEngagementById(engagementId, tenantId);
    if (!engagement) return null;

    // Parse JSONB fields for client consumption
    return {
      ...engagement,
      signatories: engagement.signatories ? JSON.parse(engagement.signatories as string) : [],
      scopes: engagement.scopes ? JSON.parse(engagement.scopes as string) : [],
      pricing: engagement.pricing ? JSON.parse(engagement.pricing as string) : [],
      dpas: engagement.dpas ? JSON.parse(engagement.dpas as string) : []
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

    // Get tenant/practice data for branding
    const practiceInfo = await this.getPracticeInfo(tenantId);

    // Import mapper here to avoid circular dependency
    const { buildEngagementViewModel } = await import('../../../server/modules/engagements/mapper');
    
    return buildEngagementViewModel(engagement, client, practiceInfo);
  }

  // Get practice/tenant information for branding
  private async getPracticeInfo(tenantId: string) {
    console.log('🔧 BRANDING: Fetching practice info for tenant:', tenantId);
    
    try {
      // Get tenant data from database
      const { tenants } = await import('../../../shared/schema');
      const [tenant] = await db
        .select()
        .from(tenants)
        .where(eq(tenants.id, tenantId))
        .limit(1);

      if (tenant) {
        const practiceInfo = {
          firmName: tenant.name || process.env.PRACTICE_NAME || 'RegnskapsAI',
          orgNumber: tenant.orgNumber || process.env.PRACTICE_ORG_NUMBER || '123 456 789',
          address: tenant.address || process.env.PRACTICE_ADDRESS || 'Postboks 123, 0123 Oslo',
          email: tenant.email || process.env.PRACTICE_EMAIL || 'post@regnskapsai.no',
          phone: tenant.phone || process.env.PRACTICE_PHONE || '+47 23 00 00 00',
          website: process.env.PRACTICE_WEBSITE || 'https://regnskapsai.no',
          logoUrl: process.env.PRACTICE_LOGO_URL || null
        };

        console.log('✅ BRANDING: Using tenant data:', { firmName: practiceInfo.firmName, orgNumber: practiceInfo.orgNumber });
        return practiceInfo;
      } else {
        console.warn('⚠️ BRANDING: Tenant not found, using environment fallbacks');
      }
    } catch (error) {
      console.error('❌ BRANDING: Error fetching tenant data:', error);
    }

    // Fallback to environment variables for development
    const fallbackInfo = {
      firmName: process.env.PRACTICE_NAME || 'RegnskapsAI',
      orgNumber: process.env.PRACTICE_ORG_NUMBER || '123 456 789',
      address: process.env.PRACTICE_ADDRESS || 'Postboks 123, 0123 Oslo',
      email: process.env.PRACTICE_EMAIL || 'post@regnskapsai.no',
      phone: process.env.PRACTICE_PHONE || '+47 23 00 00 00',
      website: process.env.PRACTICE_WEBSITE || 'https://regnskapsai.no',
      logoUrl: process.env.PRACTICE_LOGO_URL || null
    };

    console.log('🔧 BRANDING: Using environment fallback:', { firmName: fallbackInfo.firmName });
    return fallbackInfo;
  }

  // Auto-assign responsible user to client tasks
  async assignResponsibleToClientTasks(
    clientId: string, 
    userId: string, 
    options: { onlyUnassigned?: boolean } = { onlyUnassigned: true }
  ): Promise<number> {
    console.log('🔧 AUTO-ASSIGN: Starting task assignment:', { clientId, userId, options });

    try {
      // Import required modules
      const { storage } = await import('../../../server/storage');
      
      // Get all standard tasks for the client
      const allTasks = await storage.getTasksByClient(clientId);
      
      // Filter standard tasks that need updating
      const standardTaskNames = ['Bokføring', 'MVA', 'Lønn', 'Årsoppgjör', 'Annet'];
      
      const tasksToUpdate = allTasks.filter((task: any) => {
        // Must be a standard task type
        if (task.taskType !== 'standard') return false;
        
        // Must be one of the standard task names
        if (!standardTaskNames.includes(task.taskName)) return false;
        
        // Skip manually assigned tasks
        if (task.isManuallyAssigned) return false;
        
        // If onlyUnassigned is true, only update unassigned tasks
        if (options.onlyUnassigned && task.assignedTo) return false;
        
        return true;
      });

      console.log('🔧 AUTO-ASSIGN: Found tasks to update:', {
        totalTasks: allTasks.length,
        standardTasks: allTasks.filter((t: any) => t.taskType === 'standard').length,
        tasksToUpdate: tasksToUpdate.length,
        taskNames: tasksToUpdate.map((t: any) => t.taskName)
      });

      // Update the tasks
      let updatedCount = 0;
      for (const task of tasksToUpdate) {
        try {
          await storage.updateTask(task.id, { assignedTo: userId });
          updatedCount++;
          console.log(`✅ AUTO-ASSIGN: Updated task ${task.taskName} (${task.id})`);
        } catch (error) {
          console.error(`❌ AUTO-ASSIGN: Failed to update task ${task.id}:`, error);
        }
      }

      console.log(`✅ AUTO-ASSIGN: Successfully updated ${updatedCount} tasks for client ${clientId}`);
      return updatedCount;

    } catch (error) {
      console.error('❌ AUTO-ASSIGN: Error in assignResponsibleToClientTasks:', error);
      throw error;
    }
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
        clientName: clients.name,
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
        clientName: clients.name,
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
        clientName: clients.name,
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