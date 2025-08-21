import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationType } from '@prisma/client';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async createNotification(data: {
    licenseId: string;
    userId?: string;
    type: NotificationType;
    payloadJson: any;
  }) {
    return this.prisma.notification.create({
      data,
    });
  }

  async getNotifications(licenseId: string, userId?: string) {
    const where: any = { licenseId };
    
    if (userId) {
      where.OR = [
        { userId },
        { userId: null }, // System-wide notifications
      ];
    }

    return this.prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markAsRead(id: string, licenseId: string) {
    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  async markAllAsRead(licenseId: string, userId?: string) {
    const where: any = { licenseId, isRead: false };
    
    if (userId) {
      where.OR = [
        { userId },
        { userId: null },
      ];
    }

    return this.prisma.notification.updateMany({
      where,
      data: { isRead: true },
    });
  }

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async sendTaskReminders() {
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Tasks due in 7 days
    const tasksIn7Days = await this.prisma.task.findMany({
      where: {
        dueDate: {
          gte: sevenDaysFromNow,
          lt: new Date(sevenDaysFromNow.getTime() + 24 * 60 * 60 * 1000),
        },
        status: { not: 'Done' },
      },
      include: {
        client: { select: { name: true } },
        assignee: { select: { id: true, name: true } },
      },
    });

    for (const task of tasksIn7Days) {
      await this.createNotification({
        licenseId: task.licenseId,
        userId: task.assigneeUserId,
        type: NotificationType.TaskReminder,
        payloadJson: {
          taskId: task.id,
          taskTitle: task.title,
          clientName: task.client?.name,
          dueDate: task.dueDate,
          daysUntilDue: 7,
        },
      });
    }

    // Tasks due in 1 day
    const tasksIn1Day = await this.prisma.task.findMany({
      where: {
        dueDate: {
          gte: oneDayFromNow,
          lt: new Date(oneDayFromNow.getTime() + 24 * 60 * 60 * 1000),
        },
        status: { not: 'Done' },
      },
      include: {
        client: { select: { name: true } },
        assignee: { select: { id: true, name: true } },
      },
    });

    for (const task of tasksIn1Day) {
      await this.createNotification({
        licenseId: task.licenseId,
        userId: task.assigneeUserId,
        type: NotificationType.TaskReminder,
        payloadJson: {
          taskId: task.id,
          taskTitle: task.title,
          clientName: task.client?.name,
          dueDate: task.dueDate,
          daysUntilDue: 1,
        },
      });
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_10AM)
  async sendAmlReminders() {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // AML checks due in 30 days
    const amlIn30Days = await this.prisma.amlStatus.findMany({
      where: {
        nextDueAt: {
          gte: thirtyDaysFromNow,
          lt: new Date(thirtyDaysFromNow.getTime() + 24 * 60 * 60 * 1000),
        },
      },
      include: {
        client: { select: { name: true, licenseId: true } },
      },
    });

    for (const aml of amlIn30Days) {
      await this.createNotification({
        licenseId: aml.client.licenseId,
        type: NotificationType.AmlReminder,
        payloadJson: {
          clientId: aml.clientId,
          clientName: aml.client.name,
          nextDueAt: aml.nextDueAt,
          daysUntilDue: 30,
        },
      });
    }

    // AML checks due in 7 days
    const amlIn7Days = await this.prisma.amlStatus.findMany({
      where: {
        nextDueAt: {
          gte: sevenDaysFromNow,
          lt: new Date(sevenDaysFromNow.getTime() + 24 * 60 * 60 * 1000),
        },
      },
      include: {
        client: { select: { name: true, licenseId: true } },
      },
    });

    for (const aml of amlIn7Days) {
      await this.createNotification({
        licenseId: aml.client.licenseId,
        type: NotificationType.AmlReminder,
        payloadJson: {
          clientId: aml.clientId,
          clientName: aml.client.name,
          nextDueAt: aml.nextDueAt,
          daysUntilDue: 7,
        },
      });
    }

    // AML checks due in 1 day
    const amlIn1Day = await this.prisma.amlStatus.findMany({
      where: {
        nextDueAt: {
          gte: oneDayFromNow,
          lt: new Date(oneDayFromNow.getTime() + 24 * 60 * 60 * 1000),
        },
      },
      include: {
        client: { select: { name: true, licenseId: true } },
      },
    });

    for (const aml of amlIn1Day) {
      await this.createNotification({
        licenseId: aml.client.licenseId,
        type: NotificationType.AmlReminder,
        payloadJson: {
          clientId: aml.clientId,
          clientName: aml.client.name,
          nextDueAt: aml.nextDueAt,
          daysUntilDue: 1,
        },
      });
    }
  }
}