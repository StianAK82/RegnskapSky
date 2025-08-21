import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class ClientsService {
  constructor(private prisma: PrismaService) {}

  async createClient(data: {
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
    licenseId: string;
  }) {
    // Check if client with org number already exists
    if (data.orgNumber) {
      const existingClient = await this.prisma.client.findFirst({
        where: {
          licenseId: data.licenseId,
          orgNumber: data.orgNumber,
        },
      });

      if (existingClient) {
        throw new BadRequestException('Client with this organization number already exists');
      }
    }

    const client = await this.prisma.client.create({
      data,
      include: {
        responsibles: true,
        amlStatuses: true,
      },
    });

    // Create default AML status
    await this.prisma.amlStatus.create({
      data: {
        clientId: client.id,
        status: 'NotStarted',
      },
    });

    return client;
  }

  async getClients(licenseId: string) {
    return this.prisma.client.findMany({
      where: { licenseId },
      include: {
        responsibles: true,
        amlStatuses: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        _count: {
          select: {
            tasks: true,
            timeEntries: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getClient(id: string, licenseId: string) {
    return this.prisma.client.findFirst({
      where: { id, licenseId },
      include: {
        responsibles: true,
        amlStatuses: {
          orderBy: { createdAt: 'desc' },
        },
        tasks: {
          include: {
            assignee: {
              select: { id: true, name: true, email: true },
            },
            checklistItems: true,
          },
        },
        timeEntries: {
          include: {
            user: {
              select: { id: true, name: true },
            },
            task: {
              select: { id: true, title: true },
            },
          },
          orderBy: { workDate: 'desc' },
          take: 10,
        },
      },
    });
  }

  async updateClient(id: string, data: any, licenseId: string) {
    return this.prisma.client.update({
      where: { id },
      data,
      include: {
        responsibles: true,
        amlStatuses: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });
  }

  async deleteClient(id: string, licenseId: string) {
    // Verify client belongs to license
    const client = await this.prisma.client.findFirst({
      where: { id, licenseId },
    });

    if (!client) {
      throw new BadRequestException('Client not found');
    }

    return this.prisma.client.delete({
      where: { id },
    });
  }

  async addResponsible(clientId: string, data: {
    name: string;
    title?: string;
    email: string;
  }, licenseId: string) {
    // Verify client belongs to license
    const client = await this.prisma.client.findFirst({
      where: { id: clientId, licenseId },
    });

    if (!client) {
      throw new BadRequestException('Client not found');
    }

    return this.prisma.clientResponsible.create({
      data: {
        clientId,
        ...data,
      },
    });
  }

  async fetchBronnoysundData(orgNumber: string) {
    // Stub implementation for Brønnøysund registry lookup
    // In production, this would call the actual Brønnøysund API
    return {
      name: `Demo Company ${orgNumber}`,
      orgForm: 'AS',
      address: 'Storgata 1',
      postalCode: '0001',
      city: 'Oslo',
      email: `contact@demo${orgNumber}.no`,
      phone: '+47 12345678',
      naceCode: '70220',
      naceText: 'Bedriftsrådgivning og annen administrativ rådgivning',
    };
  }
}