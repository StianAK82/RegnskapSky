import { Controller, Get, Put, Body, Param, Query, Request } from '@nestjs/common';
import { AmlService } from './aml.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole, AmlStatus } from '@prisma/client';

@Controller('aml')
@Roles(UserRole.LicenseAdmin, UserRole.Employee)
export class AmlController {
  constructor(private amlService: AmlService) {}

  @Put('clients/:clientId')
  async updateAmlStatus(
    @Param('clientId') clientId: string,
    @Body() updateAmlDto: {
      status: AmlStatus;
      verifiedRef?: string;
    },
    @Request() req
  ) {
    return this.amlService.updateAmlStatus(clientId, {
      ...updateAmlDto,
      licenseId: req.licenseId,
    });
  }

  @Get('clients/:clientId')
  async getAmlStatus(@Param('clientId') clientId: string, @Request() req) {
    return this.amlService.getAmlStatus(clientId, req.licenseId);
  }

  @Get()
  async getAmlStatuses(@Request() req, @Query() query: {
    status?: AmlStatus;
    dueForReview?: string;
  }) {
    const filters: any = {};
    
    if (query.status) filters.status = query.status;
    if (query.dueForReview === 'true') filters.dueForReview = true;

    return this.amlService.getAmlStatuses(req.licenseId, filters);
  }

  @Get('dashboard')
  async getAmlDashboard(@Request() req) {
    return this.amlService.getAmlDashboard(req.licenseId);
  }

  @Get('clients/:clientId/verified-redirect')
  async redirectToVerified(@Param('clientId') clientId: string, @Request() req) {
    return this.amlService.redirectToVerified(clientId, req.licenseId);
  }
}