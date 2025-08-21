import { Controller, Get, Post, Put, Body, Param, Request } from '@nestjs/common';
import { LicensingService } from './licensing.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { SkipTenantCheck } from '../../common/decorators/skip-tenant-check.decorator';
import { UserRole, LicenseStatus } from '@prisma/client';

@Controller('licensing')
@Roles(UserRole.Vendor)
@SkipTenantCheck()
export class LicensingController {
  constructor(private licensingService: LicensingService) {}

  @Post()
  async createLicense(@Body() createLicenseDto: {
    companyName: string;
    orgNumber: string;
    adminEmail: string;
    employeeLimit: number;
    startsAt: string;
    endsAt: string;
  }) {
    return this.licensingService.createLicense({
      ...createLicenseDto,
      startsAt: new Date(createLicenseDto.startsAt),
      endsAt: new Date(createLicenseDto.endsAt),
    });
  }

  @Get()
  async getLicenses(@Request() req) {
    return this.licensingService.getLicenses(req.user.id);
  }

  @Get(':id')
  async getLicense(@Param('id') id: string) {
    return this.licensingService.getLicense(id);
  }

  @Put(':id')
  async updateLicense(
    @Param('id') id: string,
    @Body() updateLicenseDto: {
      companyName?: string;
      employeeLimit?: number;
      endsAt?: string;
      status?: LicenseStatus;
    }
  ) {
    const updateData: any = { ...updateLicenseDto };
    if (updateData.endsAt) {
      updateData.endsAt = new Date(updateData.endsAt);
    }
    return this.licensingService.updateLicense(id, updateData);
  }
}