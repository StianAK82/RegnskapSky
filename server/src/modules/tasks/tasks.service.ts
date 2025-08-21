import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TaskStatus, TaskType, Priority } from '@prisma/client';

@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService) {}

  private readonly DEFAULT_TASKS = [
    { title: 'Bokføring', description: 'Månedlig bokføring av bilag' },
    { title: 'MVA', description: 'Merverdiavgift rapportering' },
    { title: 'Lønn', description: 'Lønnkjøring og rapportering' },
    { title: 'Bankavstemming', description: 'Avstemming av bankkonti' },
    { title: 'Kontoavstemming', description: 'Avstemming av balansekonti' },
  ];

  private readonly SPECIAL_TASKS = [
    { 
      title: 'Aksjonærregister', 
      description: 'Oppdatering av aksjonærregister',
      dueDate: new Date(new Date().getFullYear(), 11, 1), // December 1
    },
    { 
      title: 'Skattemelding', 
      description: 'Innlevering av skattemelding',
      dueDate: new Date(new Date().getFullYear() + 1, 4, 31), // May 31
    },
    { 
      title: 'Årsoppgjør', 
      description: 'Årsoppgjør og årsberetning',
      dueDate: new Date(new Date().getFullYear() + 1, 6, 31), // July 31
    },
  ];

  async createDefaultTasks(clientId: string, licenseId: string) {
    const tasks = [];

    // Create standard tasks
    for (const task of this.DEFAULT_TASKS) {
      const createdTask = await this.prisma.task.create({
        data: {
          licenseId,
          clientId,
          title: task.title,
          description: task.description,
          type: TaskType.Standard,
          status: TaskStatus.Open,
          priority: Priority.Medium,
        },
      });
      tasks.push(createdTask);
    }

    // Create special deadline tasks
    for (const task of this.SPECIAL_TASKS) {
      const createdTask = await this.prisma.task.create({
        data: {
          licenseId,
          clientId,
          title: task.title,
          description: task.description,
          type: TaskType.Special,
          status: TaskStatus.Open,
          priority: Priority.High,
          dueDate: task.dueDate,
        },
      });
      tasks.push(createdTask);
    }

    return tasks;
  }

  async createTask(data: {
    title: string;
    description?: string;
    type?: TaskType;
    dueDate?: Date;
    priority?: Priority;
    clientId?: string;
    assigneeUserId?: string;
    licenseId: string;
  }) {
    return this.prisma.task.create({
      data: {
        ...data,
        type: data.type || TaskType.Custom,
        priority: data.priority || Priority.Medium,
        status: TaskStatus.Open,
      },
      include: {
        client: {
          select: { id: true, name: true },
        },
        assignee: {
          select: { id: true, name: true, email: true },
        },
        checklistItems: true,
      },
    });
  }

  async getTasks(licenseId: string, filters?: {
    clientId?: string;
    assigneeUserId?: string;
    status?: TaskStatus;
    overdue?: boolean;
  }) {
    const where: any = { licenseId };

    if (filters?.clientId) {
      where.clientId = filters.clientId;
    }

    if (filters?.assigneeUserId) {
      where.assigneeUserId = filters.assigneeUserId;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.overdue) {
      where.dueDate = {
        lt: new Date(),
      };
      where.status = {
        not: TaskStatus.Done,
      };
    }

    return this.prisma.task.findMany({
      where,
      include: {
        client: {
          select: { id: true, name: true },
        },
        assignee: {
          select: { id: true, name: true, email: true },
        },
        checklistItems: true,
        _count: {
          select: {
            checklistItems: true,
          },
        },
      },
      orderBy: [
        { dueDate: 'asc' },
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
    });
  }

  async getTask(id: string, licenseId: string) {
    return this.prisma.task.findFirst({
      where: { id, licenseId },
      include: {
        client: {
          select: { id: true, name: true },
        },
        assignee: {
          select: { id: true, name: true, email: true },
        },
        checklistItems: {
          include: {
            checker: {
              select: { id: true, name: true },
            },
          },
        },
        timeEntries: {
          include: {
            user: {
              select: { id: true, name: true },
            },
          },
          orderBy: { workDate: 'desc' },
        },
      },
    });
  }

  async updateTask(id: string, data: {
    title?: string;
    description?: string;
    status?: TaskStatus;
    priority?: Priority;
    dueDate?: Date;
    assigneeUserId?: string;
  }, licenseId: string) {
    return this.prisma.task.update({
      where: { id },
      data,
      include: {
        client: {
          select: { id: true, name: true },
        },
        assignee: {
          select: { id: true, name: true, email: true },
        },
        checklistItems: true,
      },
    });
  }

  async addChecklistItem(taskId: string, label: string, licenseId: string) {
    // Verify task belongs to license
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, licenseId },
    });

    if (!task) {
      throw new BadRequestException('Task not found');
    }

    return this.prisma.taskChecklistItem.create({
      data: {
        taskId,
        label,
      },
    });
  }

  async toggleChecklistItem(itemId: string, userId: string, licenseId: string) {
    const item = await this.prisma.taskChecklistItem.findFirst({
      where: {
        id: itemId,
        task: { licenseId },
      },
    });

    if (!item) {
      throw new BadRequestException('Checklist item not found');
    }

    return this.prisma.taskChecklistItem.update({
      where: { id: itemId },
      data: {
        isChecked: !item.isChecked,
        checkedAt: !item.isChecked ? new Date() : null,
        checkedBy: !item.isChecked ? userId : null,
      },
    });
  }

  async canMarkTaskDone(taskId: string): Promise<boolean> {
    const requiredItems = await this.prisma.taskChecklistItem.findMany({
      where: { taskId },
    });

    if (requiredItems.length === 0) {
      return true;
    }

    const checkedItems = requiredItems.filter(item => item.isChecked);
    return checkedItems.length === requiredItems.length;
  }
}