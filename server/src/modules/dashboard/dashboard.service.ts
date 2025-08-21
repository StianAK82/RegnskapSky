import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { UserRole, TaskStatus, AmlStatus } from '@prisma/client';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getVendorDashboard() {
    const [licenses, totalUsers, totalClients] = await Promise.all([
      this.prisma.license.findMany({
        include: {
          _count: {
            select: {
              users: true,
              clients: true,
              tasks: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count(),
      this.prisma.client.count(),
    ]);

    const licenseStats = licenses.map(license => ({
      id: license.id,
      companyName: license.companyName,
      orgNumber: license.orgNumber,
      status: license.status,
      employeeLimit: license.employeeLimit,
      employeesUsed: license._count.users,
      clientsCount: license._count.clients,
      tasksCount: license._count.tasks,
      endsAt: license.endsAt,
      createdAt: license.createdAt,
    }));

    return {
      totalLicenses: licenses.length,
      activeLicenses: licenses.filter(l => l.status === 'Active').length,
      totalUsers,
      totalClients,
      licenses: licenseStats,
    };
  }

  async getLicenseAdminDashboard(licenseId: string) {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      clientsCount,
      usersCount,
      openTasks,
      overdueTasks,
      completedTasksThisWeek,
      amlWarnings,
      mfaEnabledUsers,
      thisWeekHours,
      lastWeekHours,
    ] = await Promise.all([
      this.prisma.client.count({ where: { licenseId } }),
      this.prisma.user.count({ where: { licenseId } }),
      this.prisma.task.count({
        where: { licenseId, status: TaskStatus.Open },
      }),
      this.prisma.task.count({
        where: {
          licenseId,
          status: { not: TaskStatus.Done },
          dueDate: { lt: now },
        },
      }),
      this.prisma.task.count({
        where: {
          licenseId,
          status: TaskStatus.Done,
          updatedAt: { gte: oneWeekAgo },
        },
      }),
      this.prisma.amlStatus.count({
        where: {
          client: { licenseId },
          OR: [
            { status: AmlStatus.Expired },
            { nextDueAt: { lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) } },
          ],
        },
      }),
      this.prisma.user.count({
        where: { licenseId, mfaEnabled: true },
      }),
      this.prisma.timeEntry.aggregate({
        where: {
          licenseId,
          workDate: { gte: oneWeekAgo },
        },
        _sum: { hours: true },
      }),
      this.prisma.timeEntry.aggregate({
        where: {
          licenseId,
          workDate: {
            gte: new Date(oneWeekAgo.getTime() - 7 * 24 * 60 * 60 * 1000),
            lt: oneWeekAgo,
          },
        },
        _sum: { hours: true },
      }),
    ]);

    return {
      clientsCount,
      usersCount,
      tasksCount: {
        open: openTasks,
        overdue: overdueTasks,
        completedThisWeek: completedTasksThisWeek,
      },
      amlWarnings,
      mfaCoverage: {
        enabled: mfaEnabledUsers,
        total: usersCount,
        percentage: usersCount > 0 ? Math.round((mfaEnabledUsers / usersCount) * 100) : 0,
      },
      capacity: {
        thisWeekHours: Number(thisWeekHours._sum.hours || 0),
        lastWeekHours: Number(lastWeekHours._sum.hours || 0),
      },
    };
  }

  async getEmployeeDashboard(userId: string, licenseId: string) {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastWeekStart = new Date(oneWeekAgo.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      myClients,
      myTasks,
      upcomingDeadlines,
      thisWeekHours,
      lastWeekHours,
    ] = await Promise.all([
      this.prisma.client.count({
        where: {
          licenseId,
          tasks: {
            some: { assigneeUserId: userId },
          },
        },
      }),
      this.prisma.task.findMany({
        where: {
          licenseId,
          assigneeUserId: userId,
          status: { not: TaskStatus.Done },
        },
        include: {
          client: { select: { id: true, name: true } },
        },
        orderBy: { dueDate: 'asc' },
        take: 10,
      }),
      this.prisma.task.findMany({
        where: {
          licenseId,
          assigneeUserId: userId,
          status: { not: TaskStatus.Done },
          dueDate: {
            gte: now,
            lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
          },
        },
        include: {
          client: { select: { id: true, name: true } },
        },
        orderBy: { dueDate: 'asc' },
      }),
      this.prisma.timeEntry.aggregate({
        where: {
          licenseId,
          userId,
          workDate: { gte: oneWeekAgo },
        },
        _sum: { hours: true },
      }),
      this.prisma.timeEntry.aggregate({
        where: {
          licenseId,
          userId,
          workDate: {
            gte: lastWeekStart,
            lt: oneWeekAgo,
          },
        },
        _sum: { hours: true },
      }),
    ]);

    return {
      myClientsCount: myClients,
      myTasksCount: myTasks.length,
      myTasks,
      upcomingDeadlines,
      myHours: {
        thisWeek: Number(thisWeekHours._sum.hours || 0),
        lastWeek: Number(lastWeekHours._sum.hours || 0),
      },
    };
  }

  async getAISuggestions(licenseId: string, userId?: string) {
    // Stub implementation for AI suggestions
    // In production, this would analyze actual data patterns
    const suggestions = [
      'You have 3 tasks due in the next 2 days',
      'Client ABC Corp has not submitted monthly documents',
      'AML review required for 2 clients this month',
      'Time tracking completion rate is 85% this week',
      'Consider updating VAT returns for Q4 clients',
    ];

    // Filter suggestions based on user role if needed
    return {
      suggestions: suggestions.slice(0, 3),
      lastUpdated: new Date(),
    };
  }
}