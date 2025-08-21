import { Controller, Get, Post, Put, Delete, Body, Param, Query, Request } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('clients')
@Roles(UserRole.LicenseAdmin, UserRole.Employee)
export class ClientsController {
  constructor(private clientsService: ClientsService) {}

  @Get('bronnoysund/:orgNumber')
  async fetchBronnoysundData(@Param('orgNumber') orgNumber: string) {
    return this.clientsService.fetchBronnoysundData(orgNumber);
  }

  @Post()
  async createClient(@Body() createClientDto: {
    name: string;
    orgNumber?: string;
    orgForm?: string;
    email?: string;
    phone?: string;
    address?: string;
    postalCode?: string;
    city?: string;
    naceCode?: string;
    naceText?: string;
    accountingSystem?: string;
    accountingSystemUrl?: string;
    notes?: string;
  }, @Request() req) {
    return this.clientsService.createClient({
      ...createClientDto,
      licenseId: req.licenseId,
    });
  }

  @Get()
  async getClients(@Request() req) {
    return this.clientsService.getClients(req.licenseId);
  }

  @Get(':id')
  async getClient(@Param('id') id: string, @Request() req) {
    return this.clientsService.getClient(id, req.licenseId);
  }

  @Put(':id')
  async updateClient(
    @Param('id') id: string,
    @Body() updateClientDto: any,
    @Request() req
  ) {
    return this.clientsService.updateClient(id, updateClientDto, req.licenseId);
  }

  @Delete(':id')
  async deleteClient(@Param('id') id: string, @Request() req) {
    return this.clientsService.deleteClient(id, req.licenseId);
  }

  @Post(':id/responsibles')
  async addResponsible(
    @Param('id') clientId: string,
    @Body() addResponsibleDto: {
      name: string;
      title?: string;
      email: string;
    },
    @Request() req
  ) {
    return this.clientsService.addResponsible(clientId, addResponsibleDto, req.licenseId);
  }
}