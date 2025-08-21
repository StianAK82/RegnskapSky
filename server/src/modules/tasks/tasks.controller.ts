import { Controller, Get, Post, Put, Body, Param, Query, Request, BadRequestException } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole, TaskStatus, TaskType, Priority } from '@prisma/client';

@Controller('tasks')
@Roles(UserRole.LicenseAdmin, UserRole.Employee)
export class TasksController {
  constructor(private tasksService: TasksService) {}

  @Post()
  async createTask(@Body() createTaskDto: {
    title: string;
    description?: string;
    type?: TaskType;
    dueDate?: string;
    priority?: Priority;
    clientId?: string;
    assigneeUserId?: string;
  }, @Request() req) {
    const taskData: any = {
      ...createTaskDto,
      licenseId: req.licenseId,
    };

    if (createTaskDto.dueDate) {
      taskData.dueDate = new Date(createTaskDto.dueDate);
    }

    return this.tasksService.createTask(taskData);
  }

  @Get()
  async getTasks(@Request() req, @Query() query: {
    clientId?: string;
    assigneeUserId?: string;
    status?: TaskStatus;
    overdue?: string;
  }) {
    const filters: any = {};
    
    if (query.clientId) filters.clientId = query.clientId;
    if (query.assigneeUserId) filters.assigneeUserId = query.assigneeUserId;
    if (query.status) filters.status = query.status;
    if (query.overdue === 'true') filters.overdue = true;

    return this.tasksService.getTasks(req.licenseId, filters);
  }

  @Get(':id')
  async getTask(@Param('id') id: string, @Request() req) {
    return this.tasksService.getTask(id, req.licenseId);
  }

  @Put(':id')
  async updateTask(
    @Param('id') id: string,
    @Body() updateTaskDto: {
      title?: string;
      description?: string;
      status?: TaskStatus;
      priority?: Priority;
      dueDate?: string;
      assigneeUserId?: string;
    },
    @Request() req
  ) {
    // Check if trying to mark as done
    if (updateTaskDto.status === TaskStatus.Done) {
      const canMarkDone = await this.tasksService.canMarkTaskDone(id);
      if (!canMarkDone) {
        throw new BadRequestException('Cannot mark task as done - checklist items must be completed first');
      }
    }

    const updateData: any = { ...updateTaskDto };
    if (updateTaskDto.dueDate) {
      updateData.dueDate = new Date(updateTaskDto.dueDate);
    }

    return this.tasksService.updateTask(id, updateData, req.licenseId);
  }

  @Post(':id/checklist')
  async addChecklistItem(
    @Param('id') taskId: string,
    @Body() addItemDto: { label: string },
    @Request() req
  ) {
    return this.tasksService.addChecklistItem(taskId, addItemDto.label, req.licenseId);
  }

  @Put('checklist/:itemId/toggle')
  async toggleChecklistItem(@Param('itemId') itemId: string, @Request() req) {
    return this.tasksService.toggleChecklistItem(itemId, req.user.id, req.licenseId);
  }
}