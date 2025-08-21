import { Controller, Get, Post, Delete, Body, Param, Request } from '@nestjs/common';
import { FlagsService } from './flags.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('flags')
@Roles(UserRole.LicenseAdmin)
export class FlagsController {
  constructor(private flagsService: FlagsService) {}

  @Get()
  async getAllFlags(@Request() req) {
    return this.flagsService.getAllFlags(req.licenseId);
  }

  @Get(':flagKey')
  async getFlag(@Param('flagKey') flagKey: string, @Request() req) {
    return this.flagsService.getFlag(req.licenseId, flagKey);
  }

  @Post(':flagKey')
  async setFlag(
    @Param('flagKey') flagKey: string,
    @Body() body: { value: any },
    @Request() req
  ) {
    return this.flagsService.setFlag(req.licenseId, flagKey, body.value);
  }

  @Delete(':flagKey')
  async deleteFlag(@Param('flagKey') flagKey: string, @Request() req) {
    return this.flagsService.deleteFlag(req.licenseId, flagKey);
  }
}