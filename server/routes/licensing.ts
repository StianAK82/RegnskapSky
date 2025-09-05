/**
 * Licensing routes for employee license management
 */
import type { Express } from "express";
import { authenticateToken, requireRole, type AuthRequest } from "../auth";
import { licensingService } from "../services/licensing";
import { storage } from "../storage";
import { checkEmployeeLimit } from "../middleware/enforceSeatLimit";

export function registerLicensingRoutes(app: Express): void {
  
  // Toggle employee license status with seat limit checking
  app.patch("/api/employees/:id/license", 
    authenticateToken, 
    requireRole(["admin", "lisensadmin"]), 
    async (req: AuthRequest, res) => {
      try {
        const employeeId = req.params.id;
        const { isLicensed } = req.body;
        const tenantId = req.user!.tenantId;

        if (typeof isLicensed !== 'boolean') {
          return res.status(400).json({ message: "isLicensed må være true eller false" });
        }

        // Verify employee exists and belongs to tenant
        const employee = await storage.getEmployee(employeeId);
        if (!employee || employee.tenantId !== tenantId) {
          return res.status(404).json({ message: "Ansatt ikke funnet" });
        }

        // Find corresponding user by email
        const user = await storage.getUserByEmail(employee.email);
        if (!user) {
          return res.status(404).json({ message: "Bruker ikke funnet for ansatt" });
        }

        // Check seat limit when enabling license
        if (isLicensed) {
          const canAdd = await licensingService.canAddUser(tenantId);
          if (!canAdd) {
            const summary = await licensingService.getSubscriptionSummary(tenantId);
            return res.status(403).json({ 
              message: "Seat limit reached", 
              error: "SEAT_LIMIT_EXCEEDED",
              details: {
                currentSeats: summary.seatUsage,
                seatLimit: summary.employeeLimit
              }
            });
          }
        }

        // Toggle license
        await licensingService.toggleEmployeeLicense(tenantId, user.id, isLicensed);

        res.json({ 
          message: isLicensed ? "Lisens aktivert" : "Lisens deaktivert",
          employeeId,
          userId: user.id,
          isLicensed 
        });
      } catch (error: any) {
        console.error('Error toggling employee license:', error);
        res.status(500).json({ message: "Feil ved oppdatering av lisens: " + error.message });
      }
    }
  );

  // Get subscription summary for tenant (Admin only)
  app.get("/api/subscription", 
    authenticateToken, 
    requireRole(["admin", "lisensadmin"]), 
    async (req: AuthRequest, res) => {
      try {
        const tenantId = req.user!.tenantId;
        const summary = await licensingService.getSubscriptionSummary(tenantId);
        
        res.json({
          period: summary.period,
          plan: summary.plan,
          seatUsage: summary.seatUsage,
          employeeLimit: summary.employeeLimit,
          status: summary.status,
          mainLicense: summary.mainLicense,
          userLicenses: summary.userLicenses,
          total: summary.total
        });
      } catch (error: any) {
        console.error('Error getting subscription summary:', error);
        res.status(500).json({ message: "Feil ved henting av abonnementsoversikt: " + error.message });
      }
    }
  );

  // System admin view - all tenants (System Owner only)
  app.get("/api/system/subscriptions",
    authenticateToken,
    requireRole(["lisensadmin"]),
    async (req: any, res) => {
      try {
        // Check if user is system owner (stian@zaldo.no)
        if (req.user?.email !== 'stian@zaldo.no') {
          return res.status(403).json({ 
            message: "Access denied. Only system owner can view system-wide subscriptions." 
          });
        }

        // Get all tenants with their subscription data
        const allTenants = await storage.getAllTenants();
        
        const subscriptionOverview = await Promise.all(
          allTenants.map(async (tenant) => {
            try {
              const summary = await licensingService.getSubscriptionSummary(tenant.id);
              return {
                tenantId: tenant.id,
                tenantName: tenant.name,
                orgNumber: tenant.orgNumber,
                plan: summary.plan,
                seatUsage: summary.seatUsage,
                employeeLimit: summary.employeeLimit,
                status: summary.status,
                monthlyAmount: summary.total.amount,
                validTo: tenant.trialEndDate,
                createdAt: tenant.createdAt
              };
            } catch (error) {
              console.error(`Error getting subscription for tenant ${tenant.id}:`, error);
              return {
                tenantId: tenant.id,
                tenantName: tenant.name,
                orgNumber: tenant.orgNumber,
                plan: 'error',
                seatUsage: 0,
                employeeLimit: 0,
                status: 'error',
                monthlyAmount: 0,
                validTo: null,
                createdAt: tenant.createdAt,
                error: 'Failed to load subscription data'
              };
            }
          })
        );

        res.json({
          totalTenants: allTenants.length,
          subscriptions: subscriptionOverview
        });
      } catch (error: any) {
        console.error('Error fetching system subscriptions:', error);
        res.status(500).json({ message: "Feil ved henting av systemabonnementer: " + error.message });
      }
    }
  );
}