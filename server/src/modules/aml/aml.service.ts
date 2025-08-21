import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AmlStatus } from '@prisma/client';

@Injectable()
export class AmlService {
  constructor(private prisma: PrismaService) {}

  async updateAmlStatus(clientId: string, data: {
    status: AmlStatus;
    verifiedRef?: string;
    licenseId: string;
  }) {
    // Verify client belongs to license
    const client = await this.prisma.client.findFirst({
      where: { id: clientId, licenseId: data.licenseId },
    });

    if (!client) {
      throw new BadRequestException('Client not found');
    }

    const updateData: any = {
      status: data.status,
    };

    // If marking as verified, set verification details
    if (data.status === AmlStatus.Verified) {
      updateData.lastVerifiedAt = new Date();
      updateData.verifiedRef = data.verifiedRef || `REF-${Date.now()}`;
      
      // Set next due date to 12 months from now
      const nextDue = new Date();
      nextDue.setFullYear(nextDue.getFullYear() + 1);
      updateData.nextDueAt = nextDue;
    }

    // Get current AML status or create new one
    let amlStatus = await this.prisma.amlStatus.findFirst({
      where: { clientId },
      orderBy: { createdAt: 'desc' },
    });

    if (amlStatus) {
      amlStatus = await this.prisma.amlStatus.update({
        where: { id: amlStatus.id },
        data: updateData,
      });
    } else {
      amlStatus = await this.prisma.amlStatus.create({
        data: {
          clientId,
          ...updateData,
        },
      });
    }

    return amlStatus;
  }

  async getAmlStatus(clientId: string, licenseId: string) {
    // Verify client belongs to license
    const client = await this.prisma.client.findFirst({
      where: { id: clientId, licenseId },
    });

    if (!client) {
      throw new BadRequestException('Client not found');
    }

    return this.prisma.amlStatus.findFirst({
      where: { clientId },
      orderBy: { createdAt: 'desc' },
      include: {
        client: {
          select: { id: true, name: true, orgNumber: true },
        },
      },
    });
  }

  async getAmlStatuses(licenseId: string, filters?: {
    status?: AmlStatus;
    dueForReview?: boolean;
  }) {
    const where: any = {
      client: { licenseId },
    };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.dueForReview) {
      where.nextDueAt = {
        lte: new Date(),
      };
    }

    return this.prisma.amlStatus.findMany({
      where,
      include: {
        client: {
          select: { id: true, name: true, orgNumber: true },
        },
      },
      orderBy: { nextDueAt: 'asc' },
    });
  }

  async getAmlDashboard(licenseId: string) {
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);

    const [
      notStarted,
      inProgress,
      verified,
      expired,
      dueIn30Days,
      dueIn7Days,
      overdue,
    ] = await Promise.all([
      this.prisma.amlStatus.count({
        where: {
          status: AmlStatus.NotStarted,
          client: { licenseId },
        },
      }),
      this.prisma.amlStatus.count({
        where: {
          status: AmlStatus.InProgress,
          client: { licenseId },
        },
      }),
      this.prisma.amlStatus.count({
        where: {
          status: AmlStatus.Verified,
          client: { licenseId },
        },
      }),
      this.prisma.amlStatus.count({
        where: {
          status: AmlStatus.Expired,
          client: { licenseId },
        },
      }),
      this.prisma.amlStatus.count({
        where: {
          nextDueAt: {
            lte: thirtyDaysFromNow,
            gte: now,
          },
          client: { licenseId },
        },
      }),
      this.prisma.amlStatus.count({
        where: {
          nextDueAt: {
            lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
            gte: now,
          },
          client: { licenseId },
        },
      }),
      this.prisma.amlStatus.count({
        where: {
          nextDueAt: {
            lt: now,
          },
          status: {
            not: AmlStatus.Expired,
          },
          client: { licenseId },
        },
      }),
    ]);

    return {
      statusCounts: {
        notStarted,
        inProgress,
        verified,
        expired,
      },
      warnings: {
        dueIn30Days,
        dueIn7Days,
        overdue,
      },
    };
  }

  async redirectToVerified(clientId: string, licenseId: string) {
    // Verify client belongs to license
    const client = await this.prisma.client.findFirst({
      where: { id: clientId, licenseId },
    });

    if (!client) {
      throw new BadRequestException('Client not found');
    }

    // In production, this would redirect to the actual Verified service
    // For now, return a stub URL
    return {
      redirectUrl: `https://verified.example.com/check/${client.orgNumber}`,
      message: 'Redirect to Verified for AML verification',
    };
  }
}