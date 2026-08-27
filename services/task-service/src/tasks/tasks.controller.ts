import {
  Body, Controller, Delete, Get, Headers, Param, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { AssignTaskDto } from './dto/assign-task.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { CreateSubtaskDto } from './dto/create-subtask.dto';
import { UpdateSubtaskDto } from './dto/update-subtask.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@ApiTags('tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Post()
  @ApiOperation({ summary: 'Create a task (publishes TaskCreated on task-events)' })
  create(
    @Body() dto: CreateTaskDto,
    @CurrentUser('id') userId: string,
    @Headers('authorization') authHeader: string,
  ) {
    return this.tasks.create(dto, userId, authHeader);
  }

  @Get()
  @ApiQuery({ name: 'projectId', required: true })
  @ApiOperation({ summary: "List a project's tasks (Kanban board view) — caller must be a project member" })
  findAllByProject(
    @Query('projectId') projectId: string,
    @CurrentUser('id') userId: string,
    @Headers('authorization') authHeader: string,
  ) {
    return this.tasks.findAllByProject(projectId, userId, authHeader);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a task with subtasks, comments and history — caller must be a project member' })
  findOne(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Headers('authorization') authHeader: string,
  ) {
    return this.tasks.findOne(id, userId, authHeader);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a task (tracked fields are written to history)' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
    @CurrentUser('id') userId: string,
    @Headers('authorization') authHeader: string,
  ) {
    return this.tasks.update(id, dto, userId, authHeader);
  }

  @Patch(':id/assign')
  @ApiOperation({ summary: 'Assign a task to a user (publishes TaskAssigned)' })
  assign(
    @Param('id') id: string,
    @Body() dto: AssignTaskDto,
    @CurrentUser('id') userId: string,
    @Headers('authorization') authHeader: string,
  ) {
    return this.tasks.update(id, { assigneeId: dto.assigneeId }, userId, authHeader);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Change a task status (publishes TaskStatusChanged)' })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateStatusDto,
    @CurrentUser('id') userId: string,
    @Headers('authorization') authHeader: string,
  ) {
    return this.tasks.update(id, { status: dto.status }, userId, authHeader);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a task' })
  remove(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Headers('authorization') authHeader: string,
  ) {
    return this.tasks.remove(id, userId, authHeader);
  }

  // --- Subtasks -------------------------------------------------------------
  @Post(':id/subtasks')
  @ApiOperation({ summary: 'Add a subtask' })
  addSubtask(
    @Param('id') id: string,
    @Body() dto: CreateSubtaskDto,
    @CurrentUser('id') userId: string,
    @Headers('authorization') authHeader: string,
  ) {
    return this.tasks.addSubtask(id, dto, userId, authHeader);
  }

  @Get(':id/subtasks')
  @ApiOperation({ summary: 'List subtasks' })
  listSubtasks(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Headers('authorization') authHeader: string,
  ) {
    return this.tasks.listSubtasks(id, userId, authHeader);
  }

  @Patch(':id/subtasks/:subtaskId')
  @ApiOperation({ summary: 'Update a subtask (e.g. mark done)' })
  updateSubtask(
    @Param('id') id: string,
    @Param('subtaskId') subtaskId: string,
    @Body() dto: UpdateSubtaskDto,
    @CurrentUser('id') userId: string,
    @Headers('authorization') authHeader: string,
  ) {
    return this.tasks.updateSubtask(id, subtaskId, dto, userId, authHeader);
  }

  @Delete(':id/subtasks/:subtaskId')
  @ApiOperation({ summary: 'Delete a subtask' })
  removeSubtask(
    @Param('id') id: string,
    @Param('subtaskId') subtaskId: string,
    @CurrentUser('id') userId: string,
    @Headers('authorization') authHeader: string,
  ) {
    return this.tasks.removeSubtask(id, subtaskId, userId, authHeader);
  }

  // --- Comments -------------------------------------------------------------
  @Post(':id/comments')
  @ApiOperation({ summary: 'Add a comment' })
  addComment(
    @Param('id') id: string,
    @Body() dto: CreateCommentDto,
    @CurrentUser('id') userId: string,
    @Headers('authorization') authHeader: string,
  ) {
    return this.tasks.addComment(id, dto, userId, authHeader);
  }

  @Get(':id/comments')
  @ApiOperation({ summary: 'List comments' })
  listComments(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Headers('authorization') authHeader: string,
  ) {
    return this.tasks.listComments(id, userId, authHeader);
  }

  // --- History ----------------------------------------------------------------
  @Get(':id/history')
  @ApiOperation({ summary: 'List the modification history of a task' })
  listHistory(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Headers('authorization') authHeader: string,
  ) {
    return this.tasks.listHistory(id, userId, authHeader);
  }
}
