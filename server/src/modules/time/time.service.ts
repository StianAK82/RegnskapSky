import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class TimeService {
  constructor(private prisma: PrismaService) {}

  async createTimeEntry(data: {
    clientId: string;
    taskId?: string;
    userId: string;
    hours: number;
    workDate: Date;
    notes: string;
    licenseId: string;
  }) {
    // Verify client belongs to license
    const client = await this.prisma.client.findFirst({
      where: { id: data.clientId, licenseId: data.licenseId },
    });

    if (!client) {
      throw new BadRequestException('Client not found');
    }

    // Verify task belongs to client if provided
    if (data.taskId) {
      const task = await this.prisma.task.findFirst({
        where: { id: data.taskId, clientId: data.clientId, licenseId: data.licenseId },
      });

      if (!task) {
        throw new BadRequestException('Task not found');
      }
    }

    return this.prisma.timeEntry.create({
      data,
      include: {
        client: {
          select: { id: true, name: true },
        },
        task: {
          select: { id: true, title: true },
        },
        user: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async getTimeEntries(licenseId: string, filters?: {
    userId?: string;
    clientId?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    const where: any = { licenseId };

    if (filters?.userId) {
      where.userId = filters.userId;
    }

    if (filters?.clientId) {
      where.clientId = filters.clientId;
    }

    if (filters?.startDate || filters?.endDate) {
      where.workDate = {};
      if (filters.startDate) {
        where.workDate.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.workDate.lte = filters.endDate;
      }
    }

    return this.prisma.timeEntry.findMany({
      where,
      include: {
        client: {
          select: { id: true, name: true },
        },
        task: {
          select: { id: true, title: true },
        },
        user: {
          select: { id: true, name: true },
        },
      },
      orderBy: { workDate: 'desc' },
    });
  }

  async getTimeEntry(id: string, licenseId: string) {
    return this.prisma.timeEntry.findFirst({
      where: { id, licenseId },
      include: {
        client: {
          select: { id: true, name: true },
        },
        task: {
          select: { id: true, title: true },
        },
        user: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async updateTimeEntry(id: string, data: {
    hours?: number;
    notes?: string;
    workDate?: Date;
  }, licenseId: string) {
    return this.prisma.timeEntry.update({
      where: { id },
      data,
      include: {
        client: {
          select: { id: true, name: true },
        },
        task: {
          select: { id: true, title: true },
        },
        user: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async deleteTimeEntry(id: string, licenseId: string) {
    // Verify entry belongs to license
    const entry = await this.prisma.timeEntry.findFirst({
      where: { id, licenseId },
    });

    if (!entry) {
      throw new BadRequestException('Time entry not found');
    }

    return this.prisma.timeEntry.delete({
      where: { id },
    });
  }

  async getTimeReports(licenseId: string, filters?: {
    startDate?: Date;
    endDate?: Date;
    userId?: string;
    clientId?: string;
  }) {
    const where: any = { licenseId };

    if (filters?.userId) {
      where.userId = filters.userId;
    }

    if (filters?.clientId) {
      where.clientId = filters.clientId;
    }

    if (filters?.startDate || filters?.endDate) {
      where.workDate = {};
      if (filters.startDate) {
        where.workDate.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.workDate.lte = filters.endDate;
      }
    }

    // Get aggregated data
    const timeEntries = await this.prisma.timeEntry.findMany({
      where,
      include: {
        client: { select: { id: true, name: true } },
        user: { select: { id: true, name: true } },
        task: { select: { id: true, title: true } },
      },
    });

    // Group by employee
    const byEmployee = timeEntries.reduce((acc, entry) => {
      const key = entry.user.id;
      if (!acc[key]) {
        acc[key] = {
          user: entry.user,
          totalHours: 0,
          entries: [],
        };
      }
      acc[key].totalHours += Number(entry.hours);
      acc[key].entries.push(entry);
      return acc;
    }, {});

    // Group by client
    const byClient = timeEntries.reduce((acc, entry) => {
      const key = entry.client.id;
      if (!acc[key]) {
        acc[key] = {
          client: entry.client,
          totalHours: 0,
          entries: [],
        };
      }
      acc[key].totalHours += Number(entry.hours);
      acc[key].entries.push(entry);
      return acc;
    }, {});

    return {
      byEmployee: Object.values(byEmployee),
      byClient: Object.values(byClient),
      totalHours: timeEntries.reduce((sum, entry) => sum + Number(entry.hours), 0),
      totalEntries: timeEntries.length,
    };
  }
}