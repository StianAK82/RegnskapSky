import { Controller, Get, Query, Request } from '@nestjs/common';
import { AuditService } from './audit.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { SkipTenantCheck } from '../../common/decorators/skip-tenant-check.decorator';
import { UserRole } from '@prisma/client';

@Controller('audit')
export class AuditController {
  constructor(private auditService: AuditService) {}

  @Get()
  @Roles(UserRole.LicenseAdmin, UserRole.Vendor)
  async getAuditLogs(@Request() req, @Query() query: {
    actorUserId?: string;
    action?: string;
    targetType?: string;
    startDate?: string;
    endDate?: string;
    limit?: string;
  }) {
    const filters: any = {};
    
    if (query.actorUserId) filters.actorUserId = query.actorUserId;
    if (query.action) filters.action = query.action;
    if (query.targetType) filters.targetType = query.targetType;
    if (query.startDate) filters.startDate = new Date(query.startDate);
    if (query.endDate) filters.endDate = new Date(query.endDate);
    if (query.limit) filters.limit = parseInt(query.limit);

    // Vendor users can see all logs, others only their license
    const licenseId = req.user.role === UserRole.Vendor ? undefined : req.licenseId;
    
    return this.auditService.getAuditLogs(licenseId, filters);
  }

  @Get('vendor')
  @Roles(UserRole.Vendor)
  @SkipTenantCheck()
  async getVendorAuditLogs(@Query() query: {
    actorUserId?: string;
    action?: string;
    targetType?: string;
    startDate?: string;
    endDate?: string;
    limit?: string;
  }) {
    const filters: any = {};
    
    if (query.actorUserId) filters.actorUserId = query.actorUserId;
    if (query.action) filters.action = query.action;
    if (query.targetType) filters.targetType = query.targetType;
    if (query.startDate) filters.startDate = new Date(query.startDate);
    if (query.endDate) filters.endDate = new Date(query.endDate);
    if (query.limit) filters.limit = parseInt(query.limit);

    return this.auditService.getAuditLogs(undefined, filters);
  }
}