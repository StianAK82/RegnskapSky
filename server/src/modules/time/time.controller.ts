import { Controller, Get, Post, Put, Delete, Body, Param, Query, Request } from '@nestjs/common';
import { TimeService } from './time.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('time')
@Roles(UserRole.LicenseAdmin, UserRole.Employee)
export class TimeController {
  constructor(private timeService: TimeService) {}

  @Post()
  async createTimeEntry(@Body() createTimeEntryDto: {
    clientId: string;
    taskId?: string;
    hours: number;
    workDate: string;
    notes: string;
  }, @Request() req) {
    return this.timeService.createTimeEntry({
      ...createTimeEntryDto,
      workDate: new Date(createTimeEntryDto.workDate),
      userId: req.user.id,
      licenseId: req.licenseId,
    });
  }

  @Get()
  async getTimeEntries(@Request() req, @Query() query: {
    userId?: string;
    clientId?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const filters: any = {};
    
    if (query.userId) filters.userId = query.userId;
    if (query.clientId) filters.clientId = query.clientId;
    if (query.startDate) filters.startDate = new Date(query.startDate);
    if (query.endDate) filters.endDate = new Date(query.endDate);

    return this.timeService.getTimeEntries(req.licenseId, filters);
  }

  @Get('reports')
  async getTimeReports(@Request() req, @Query() query: {
    startDate?: string;
    endDate?: string;
    userId?: string;
    clientId?: string;
  }) {
    const filters: any = {};
    
    if (query.userId) filters.userId = query.userId;
    if (query.clientId) filters.clientId = query.clientId;
    if (query.startDate) filters.startDate = new Date(query.startDate);
    if (query.endDate) filters.endDate = new Date(query.endDate);

    return this.timeService.getTimeReports(req.licenseId, filters);
  }

  @Get(':id')
  async getTimeEntry(@Param('id') id: string, @Request() req) {
    return this.timeService.getTimeEntry(id, req.licenseId);
  }

  @Put(':id')
  async updateTimeEntry(
    @Param('id') id: string,
    @Body() updateTimeEntryDto: {
      hours?: number;
      notes?: string;
      workDate?: string;
    },
    @Request() req
  ) {
    const updateData: any = { ...updateTimeEntryDto };
    if (updateTimeEntryDto.workDate) {
      updateData.workDate = new Date(updateTimeEntryDto.workDate);
    }

    return this.timeService.updateTimeEntry(id, updateData, req.licenseId);
  }

  @Delete(':id')
  async deleteTimeEntry(@Param('id') id: string, @Request() req) {
    return this.timeService.deleteTimeEntry(id, req.licenseId);
  }
}