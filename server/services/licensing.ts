/**
 * Licensing service for managing user licenses and billing
 */
import { db } from '../db';
import { 
  subscriptions, licensedEmployees, invoices, invoiceLines, users, tenants, licenseUsageSnapshots,
  type InsertSubscription, type InsertLicensedEmployee, 
  type InsertInvoice, type InsertInvoiceLine, type Invoice, type InsertLicenseUsageSnapshot
} from '../../shared/schema';
import { eq, and, sql } from 'drizzle-orm';
import { 
  currentPeriod, getPeriodDates, generateInvoiceId, 
  USER_LICENSE_PRICE, BASE_LICENSE_PRICE 
} from '../utils/license';

export class LicensingService {
  /**
   * Get or create a draft invoice for the current period
   */
  async getOrCreateDraftInvoice(tenantId: string, period: string = currentPeriod()): Promise<Invoice> {
    const { start, end } = getPeriodDates(period);
    
    // Try to find existing invoice for this period
    const [existingInvoice] = await db
      .select()
      .from(invoices)
      .where(
        and(
          eq(invoices.tenantId, tenantId),
          eq(invoices.periodStart, start),
          eq(invoices.periodEnd, end)
        )
      );

    if (existingInvoice) {
      return existingInvoice;
    }

    // Create new invoice
    const invoiceId = generateInvoiceId(tenantId, period);
    
    const [newInvoice] = await db
      .insert(invoices)
      .values({
        tenantId,
        invoiceId,
        periodStart: start,
        periodEnd: end,
        totalAmount: "0", // Will be calculated as lines are added
        status: "draft"
      })
      .returning();

    return newInvoice;
  }

  /**
   * Upsert a licensed employee for a specific period
   * Idempotent - won't create duplicates for same user/period
   */
  async upsertLicensedEmployee(tenantId: string, userId: string, period: string = currentPeriod()): Promise<void> {
    // Check if already exists for this period
    const [existing] = await db
      .select()
      .from(licensedEmployees)
      .where(
        and(
          eq(licensedEmployees.tenantId, tenantId),
          eq(licensedEmployees.userId, userId),
          eq(licensedEmployees.period, period)
        )
      );

    if (existing) {
      // Update existing record to ensure it's licensed
      await db
        .update(licensedEmployees)
        .set({ 
          isLicensed: true,
          verifiedAt: new Date()
        })
        .where(eq(licensedEmployees.id, existing.id));
    } else {
      // Create new record
      await db
        .insert(licensedEmployees)
        .values({
          tenantId,
          userId,
          period,
          isLicensed: true,
          verifiedAt: new Date()
        });
    }
  }

  /**
   * Create or update user license line in invoice
   */
  async upsertUserLicenseLine(
    invoiceId: string, 
    userId: string, 
    period: string = currentPeriod(), 
    price: number = USER_LICENSE_PRICE
  ): Promise<void> {
    // Get user info for description
    const [user] = await db
      .select({ firstName: users.firstName, lastName: users.lastName, email: users.email })
      .from(users)
      .where(eq(users.id, userId));

    const userName = user ? `${user.firstName} ${user.lastName}` : 'Unknown User';
    const description = `Brukerlisens - ${userName} (${period})`;

    // Check if line already exists
    const [existingLine] = await db
      .select()
      .from(invoiceLines)
      .where(
        and(
          eq(invoiceLines.invoiceId, invoiceId),
          eq(invoiceLines.type, 'USER_LICENSE'),
          eq(invoiceLines.metadata, JSON.stringify({ userId, period }))
        )
      );

    if (existingLine) {
      // Update existing line
      await db
        .update(invoiceLines)
        .set({
          description,
          unitPrice: price.toString(),
          amount: price.toString()
        })
        .where(eq(invoiceLines.id, existingLine.id));
    } else {
      // Create new line
      await db
        .insert(invoiceLines)
        .values({
          invoiceId,
          type: 'USER_LICENSE',
          description,
          qty: 1,
          unitPrice: price.toString(),
          amount: price.toString(),
          metadata: { userId, period }
        });
    }

    // Recalculate invoice total
    await this.recalculateInvoiceTotal(invoiceId);
  }

  /**
   * Create main license line if it doesn't exist
   */
  async ensureMainLicenseLine(invoiceId: string, period: string = currentPeriod()): Promise<void> {
    // Check if main license line exists
    const [existingLine] = await db
      .select()
      .from(invoiceLines)
      .where(
        and(
          eq(invoiceLines.invoiceId, invoiceId),
          eq(invoiceLines.type, 'MAIN_LICENSE')
        )
      );

    if (!existingLine) {
      // Create main license line
      await db
        .insert(invoiceLines)
        .values({
          invoiceId,
          type: 'MAIN_LICENSE',
          description: `Hovedlisens RegnskapsAI (${period})`,
          qty: 1,
          unitPrice: BASE_LICENSE_PRICE.toString(),
          amount: BASE_LICENSE_PRICE.toString(),
          metadata: { period, type: 'main_license' }
        });

      // Recalculate invoice total
      await this.recalculateInvoiceTotal(invoiceId);
    }
  }

  /**
   * Recalculate invoice total amount
   */
  async recalculateInvoiceTotal(invoiceId: string): Promise<void> {
    const lines = await db
      .select({ amount: invoiceLines.amount })
      .from(invoiceLines)
      .where(eq(invoiceLines.invoiceId, invoiceId));

    const total = lines.reduce((sum, line) => sum + parseFloat(line.amount), 0);

    await db
      .update(invoices)
      .set({ 
        totalAmount: total.toString(),
        updatedAt: new Date()
      })
      .where(eq(invoices.id, invoiceId));
  }

  /**
   * Process new employee license (main entry point)
   */
  async processNewEmployeeLicense(tenantId: string, userId: string): Promise<void> {
    const period = currentPeriod();
    
    // Start transaction-like operations
    await db.transaction(async (tx) => {
      // 1. Update user as licensed
      await tx
        .update(users)
        .set({ 
          isLicensed: true, 
          verifiedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));

      // 2. Upsert licensed employee record
      await this.upsertLicensedEmployee(tenantId, userId, period);

      // 3. Get or create draft invoice
      const invoice = await this.getOrCreateDraftInvoice(tenantId, period);

      // 4. Ensure main license line exists
      await this.ensureMainLicenseLine(invoice.id, period);

      // 5. Add/update user license line
      await this.upsertUserLicenseLine(invoice.id, userId, period);
    });
  }

  /**
   * Toggle employee license status
   */
  /**
   * Get current license status for an employee
   */
  async getEmployeeLicenseStatus(tenantId: string, userId: string): Promise<boolean> {
    const [user] = await db
      .select({ isLicensed: users.isLicensed })
      .from(users)
      .where(eq(users.id, userId));
    
    return user?.isLicensed || false;
  }

  async toggleEmployeeLicense(tenantId: string, userId: string, isLicensed: boolean): Promise<void> {
    console.log(`Toggling license for user ${userId} to ${isLicensed}`);
    
    // Simple update without complex transactions
    await db
      .update(users)
      .set({ 
        isLicensed,
        verifiedAt: isLicensed ? new Date() : null,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));

    console.log(`Successfully updated user license status to ${isLicensed}`);
  }

  /**
   * Get current seat usage (count of active licensed users)
   */
  async getSeatUsage(tenantId: string): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(
        and(
          eq(users.tenantId, tenantId),
          eq(users.isLicensed, true),
          eq(users.isActive, true)
        )
      );

    return result.count;
  }

  /**
   * Check if tenant can add a new user (within seat limit)
   */
  async canAddUser(tenantId: string): Promise<boolean> {
    // Get tenant's employee limit
    const [tenant] = await db
      .select({ employeeLimit: tenants.employeeLimit })
      .from(tenants)
      .where(eq(tenants.id, tenantId));

    if (!tenant) {
      throw new Error('Tenant not found');
    }

    // Get current seat usage
    const seatUsage = await this.getSeatUsage(tenantId);
    
    return seatUsage < (tenant.employeeLimit || 5); // Default to 5 if not set
  }

  /**
   * Create a license usage snapshot for historical tracking
   */
  async createLicenseUsageSnapshot(tenantId: string, date: Date = new Date()): Promise<void> {
    const seatCount = await this.getSeatUsage(tenantId);
    
    // Get tenant's current employee limit
    const [tenant] = await db
      .select({ employeeLimit: tenants.employeeLimit })
      .from(tenants)
      .where(eq(tenants.id, tenantId));

    const employeeLimit = tenant?.employeeLimit || 5;

    await db
      .insert(licenseUsageSnapshots)
      .values({
        tenantId,
        date,
        seatCount,
        employeeLimit
      });
  }

  /**
   * Get subscription summary for frontend display (enhanced with seat limits)
   */
  async getSubscriptionSummary(tenantId: string, period: string = currentPeriod()) {
    // Get tenant info including employee limit
    const [tenant] = await db
      .select({ 
        employeeLimit: tenants.employeeLimit,
        subscriptionPlan: tenants.subscriptionPlan,
        subscriptionStatus: tenants.subscriptionStatus
      })
      .from(tenants)
      .where(eq(tenants.id, tenantId));

    if (!tenant) {
      throw new Error('Tenant not found');
    }

    // Get current seat usage
    const seatUsage = await this.getSeatUsage(tenantId);
    const employeeLimit = tenant.employeeLimit || 5;
    
    const userLicenseAmount = seatUsage * USER_LICENSE_PRICE;
    const totalAmount = BASE_LICENSE_PRICE + userLicenseAmount;

    console.log(`Subscription summary: ${seatUsage}/${employeeLimit} licensed users, total: ${totalAmount} NOK`);

    return {
      period,
      plan: tenant.subscriptionPlan || 'basic',
      seatUsage,
      employeeLimit,
      status: tenant.subscriptionStatus || 'active',
      mainLicense: {
        description: 'Hovedlisens RegnskapsAI',
        amount: BASE_LICENSE_PRICE,
        currency: 'NOK'
      },
      userLicenses: {
        description: 'Brukerlisenser',
        unitPrice: USER_LICENSE_PRICE,
        quantity: seatUsage,
        amount: userLicenseAmount,
        currency: 'NOK'
      },
      total: {
        amount: totalAmount,
        currency: 'NOK'
      }
    };
  }
}

// Export a singleton instance
export const licensingService = new LicensingService();