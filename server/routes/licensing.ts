/**
 * Licensing routes for employee license management
 */
import type { Express } from "express";
import { authenticateToken, requireRole, type AuthRequest } from "../auth";
import { LicensingService } from "../services/licensing";
import { storage } from "../storage";

const licensingService = new LicensingService();

export function registerLicensingRoutes(app: Express): void {
  
  // Toggle employee license status (Admin only)
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
          mainLicense: {
            description: "RegnskapsAI Hovedlisens",
            amount: summary.mainLicense,
            currency: "NOK"
          },
          userLicenses: {
            description: `Brukerlisenser (${summary.totalUsers} stk)`,
            unitPrice: 500,
            quantity: summary.totalUsers,
            amount: summary.userLicenses,
            currency: "NOK"
          },
          total: {
            amount: summary.totalAmount,
            currency: "NOK"
          }
        });
      } catch (error: any) {
        console.error('Error getting subscription summary:', error);
        res.status(500).json({ message: "Feil ved henting av abonnementsoversikt: " + error.message });
      }
    }
  );

  // System admin view - all tenants (Lisensadmin only)
  app.get("/api/system/subscriptions",
    authenticateToken,
    requireRole(["lisensadmin"]),
    async (req: AuthRequest, res) => {
      try {
        // This would be implemented for system-wide view
        // For now, return placeholder to meet requirements
        res.json({
          message: "System-wide subscription view - to be implemented",
          note: "This endpoint will show all tenant summaries for system administrators"
        });
      } catch (error: any) {
        console.error('Error getting system subscriptions:', error);
        res.status(500).json({ message: "Feil ved henting av systemabonnementer: " + error.message });
      }
    }
  );
}