import { Controller, Get, Request } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { SkipTenantCheck } from '../../common/decorators/skip-tenant-check.decorator';
import { UserRole } from '@prisma/client';

@Controller('dashboard')
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get('vendor')
  @Roles(UserRole.Vendor)
  @SkipTenantCheck()
  async getVendorDashboard() {
    return this.dashboardService.getVendorDashboard();
  }

  @Get('license-admin')
  @Roles(UserRole.LicenseAdmin)
  async getLicenseAdminDashboard(@Request() req) {
    return this.dashboardService.getLicenseAdminDashboard(req.licenseId);
  }

  @Get('employee')
  @Roles(UserRole.Employee)
  async getEmployeeDashboard(@Request() req) {
    return this.dashboardService.getEmployeeDashboard(req.user.id, req.licenseId);
  }

  @Get('ai-suggestions')
  @Roles(UserRole.LicenseAdmin, UserRole.Employee)
  async getAISuggestions(@Request() req) {
    return this.dashboardService.getAISuggestions(req.licenseId, req.user.id);
  }
}