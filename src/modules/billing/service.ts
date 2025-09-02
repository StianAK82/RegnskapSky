import { db } from "../../server/db";
import { tenants, users } from "../../shared/schema";
import { eq, and, sql } from "drizzle-orm";
import * as XLSX from "xlsx";

export interface TenantBilling {
  id: string;
  name: string;
  orgNumber?: string;
  email?: string;
  subscriptionStatus: 'trial' | 'active' | 'suspended' | 'cancelled';
  monthlyRate: number;
  licensedUsers: number;
  totalMonthlyAmount: number;
  trialStartDate: string;
  trialEndDate?: string;
  lastBilledDate?: string;
  createdAt: string;
  formattedTrialStart?: string;
  formattedTrialEnd?: string;
  formattedCreatedAt?: string;
  formattedLastBilled?: string;
}

export class BillingService {
  private formatDate(date: string | null): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString('no-NO');
  }

  async getAllTenantsBilling(): Promise<TenantBilling[]> {
    // Hent alle tenants med deres lisensinformasjon
    const tenantsData = await db
      .select({
        id: tenants.id,
        name: tenants.name,
        orgNumber: tenants.orgNumber,
        email: tenants.email,
        subscriptionStatus: tenants.subscriptionStatus,
        monthlyRate: tenants.monthlyRate,
        trialStartDate: tenants.trialStartDate,
        trialEndDate: tenants.trialEndDate,
        lastBilledDate: tenants.lastBilledDate,
        createdAt: tenants.createdAt,
      })
      .from(tenants)
      .orderBy(tenants.createdAt);

    // For hver tenant, hent antall lisensierte brukere
    const enrichedTenants = await Promise.all(
      tenantsData.map(async (tenant) => {
        const [licenseCount] = await db
          .select({ count: sql<number>`count(*)` })
          .from(users)
          .where(
            and(
              eq(users.tenantId, tenant.id),
              eq(users.isLicensed, true)
            )
          );

        const licensedUsers = licenseCount.count;
        const baseRate = 2500; // Fast basepris
        const userLicenseCost = licensedUsers * 500; // 500 kr per lisensiert bruker
        const totalMonthlyAmount = baseRate + userLicenseCost;

        return {
          ...tenant,
          licensedUsers,
          totalMonthlyAmount,
          monthlyRate: baseRate,
          trialEndDate: tenant.trialStartDate ? 
            new Date(new Date(tenant.trialStartDate).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString() : // 30 dagers prøveperiode
            null,
          formattedTrialStart: this.formatDate(tenant.trialStartDate),
          formattedTrialEnd: tenant.trialStartDate ? 
            this.formatDate(new Date(new Date(tenant.trialStartDate).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()) : '',
          formattedCreatedAt: this.formatDate(tenant.createdAt),
          formattedLastBilled: this.formatDate(tenant.lastBilledDate)
        } as TenantBilling;
      })
    );

    return enrichedTenants;
  }

  async generateExcelReport(tenants: TenantBilling[]): Promise<Buffer> {
    const excelData = tenants.map(tenant => ({
      'Bedriftsnavn': tenant.name,
      'Org.nummer': tenant.orgNumber,
      'E-post': tenant.email,
      'Status': tenant.subscriptionStatus,
      'Lisensierte brukere': tenant.licensedUsers,
      'Basepris': `${tenant.monthlyRate} kr`,
      'Brukerkostnad': `${tenant.licensedUsers * 500} kr`,
      'Total månedlig': `${tenant.totalMonthlyAmount} kr`,
      'Prøveperiode start': tenant.formattedTrialStart,
      'Prøveperiode slutt': tenant.formattedTrialEnd,
      'Opprettet': tenant.formattedCreatedAt,
      'Sist fakturert': tenant.formattedLastBilled
    }));

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    
    // Sett kolonnebredder
    const columnWidths = [
      { wch: 25 }, // Bedriftsnavn
      { wch: 12 }, // Org.nummer
      { wch: 30 }, // E-post
      { wch: 12 }, // Status
      { wch: 15 }, // Lisensierte brukere
      { wch: 12 }, // Basepris
      { wch: 15 }, // Brukerkostnad
      { wch: 15 }, // Total månedlig
      { wch: 15 }, // Prøveperiode start
      { wch: 15 }, // Prøveperiode slutt
      { wch: 12 }, // Opprettet
      { wch: 15 }  // Sist fakturert
    ];
    worksheet['!cols'] = columnWidths;

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Systemfakturering');
    
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }
}

export const billingService = new BillingService();