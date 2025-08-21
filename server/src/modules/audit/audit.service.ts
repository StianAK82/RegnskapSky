import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async createAuditLog(data: {
    licenseId?: string;
    actorUserId: string;
    action: string;
    targetType: string;
    targetId: string;
    metaJson: any;
    ip?: string;
    userAgent?: string;
  }) {
    return this.prisma.auditLog.create({
      data,
    });
  }

  async getAuditLogs(licenseId?: string, filters?: {
    actorUserId?: string;
    action?: string;
    targetType?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }) {
    const where: any = {};
    
    if (licenseId) {
      where.licenseId = licenseId;
    }

    if (filters?.actorUserId) {
      where.actorUserId = filters.actorUserId;
    }

    if (filters?.action) {
      where.action = filters.action;
    }

    if (filters?.targetType) {
      where.targetType = filters.targetType;
    }

    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.createdAt.lte = filters.endDate;
      }
    }

    return this.prisma.auditLog.findMany({
      where,
      include: {
        actor: {
          select: { id: true, name: true, email: true },
        },
        license: {
          select: { id: true, companyName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: filters?.limit || 100,
    });
  }

  async logAuthAction(userId: string, action: string, metadata: any, ip?: string, userAgent?: string) {
    return this.createAuditLog({
      actorUserId: userId,
      action: `auth.${action}`,
      targetType: 'User',
      targetId: userId,
      metaJson: metadata,
      ip,
      userAgent,
    });
  }

  async logLicenseAction(userId: string, licenseId: string, action: string, metadata: any) {
    return this.createAuditLog({
      licenseId,
      actorUserId: userId,
      action: `license.${action}`,
      targetType: 'License',
      targetId: licenseId,
      metaJson: metadata,
    });
  }

  async logUserAction(userId: string, licenseId: string, targetUserId: string, action: string, metadata: any) {
    return this.createAuditLog({
      licenseId,
      actorUserId: userId,
      action: `user.${action}`,
      targetType: 'User',
      targetId: targetUserId,
      metaJson: metadata,
    });
  }

  async logClientAction(userId: string, licenseId: string, clientId: string, action: string, metadata: any) {
    return this.createAuditLog({
      licenseId,
      actorUserId: userId,
      action: `client.${action}`,
      targetType: 'Client',
      targetId: clientId,
      metaJson: metadata,
    });
  }

  async logTaskAction(userId: string, licenseId: string, taskId: string, action: string, metadata: any) {
    return this.createAuditLog({
      licenseId,
      actorUserId: userId,
      action: `task.${action}`,
      targetType: 'Task',
      targetId: taskId,
      metaJson: metadata,
    });
  }

  async logTimeAction(userId: string, licenseId: string, timeEntryId: string, action: string, metadata: any) {
    return this.createAuditLog({
      licenseId,
      actorUserId: userId,
      action: `time.${action}`,
      targetType: 'TimeEntry',
      targetId: timeEntryId,
      metaJson: metadata,
    });
  }

  async logAmlAction(userId: string, licenseId: string, clientId: string, action: string, metadata: any) {
    return this.createAuditLog({
      licenseId,
      actorUserId: userId,
      action: `aml.${action}`,
      targetType: 'AMLStatus',
      targetId: clientId,
      metaJson: metadata,
    });
  }
}