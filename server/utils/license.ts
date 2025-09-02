/**
 * License utility functions for billing periods and calculations
 */

/**
 * Get current billing period in YYYY-MM format
 * @returns Current period string
 */
export function currentPeriod(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Get period start and end dates for a given period
 * @param period Period in YYYY-MM format
 * @returns Start and end dates for the period
 */
export function getPeriodDates(period: string): { start: Date; end: Date } {
  const [year, month] = period.split('-').map(Number);
  
  const start = new Date(year, month - 1, 1); // month - 1 because Date constructor expects 0-based month
  const end = new Date(year, month, 0, 23, 59, 59, 999); // Last day of the month
  
  return { start, end };
}

/**
 * Calculate the next billing period
 * @param period Current period in YYYY-MM format
 * @returns Next period string
 */
export function nextPeriod(period: string): string {
  const [year, month] = period.split('-').map(Number);
  
  if (month === 12) {
    return `${year + 1}-01`;
  } else {
    const nextMonth = (month + 1).toString().padStart(2, '0');
    return `${year}-${nextMonth}`;
  }
}

/**
 * Generate invoice ID for a tenant and period
 * @param tenantId Tenant ID
 * @param period Period in YYYY-MM format
 * @returns Generated invoice ID
 */
export function generateInvoiceId(tenantId: string, period: string): string {
  const shortTenantId = tenantId.substring(0, 8);
  return `INV-${shortTenantId}-${period}`;
}

/**
 * User license price in NOK
 */
export const USER_LICENSE_PRICE = 500;

/**
 * Base license price in NOK
 */
export const BASE_LICENSE_PRICE = 2500;