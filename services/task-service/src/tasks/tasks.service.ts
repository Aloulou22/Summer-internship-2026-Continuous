import { Injectable, Logger, NotFoundException, Inject, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientKafka } from '@nestjs/microservices';
import { Task, TaskStatus } from './entities/task.entity';
import { Subtask } from './entities/subtask.entity';
import { Comment } from './entities/comment.entity';
import { TaskHistory } from './entities/task-history.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { CreateSubtaskDto } from './dto/create-subtask.dto';
import { UpdateSubtaskDto } from './dto/update-subtask.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { RedisService } from '../redis/redis.service';
import { ProjectsClientService } from '../projects/projects-client.service';

const CACHE_PREFIX = 'task-service:tasks:';
const CACHE_TTL_SECONDS = 15;

// Tracked fields: a change to any of these is written to task_history and,
// for assigneeId/status, also published on task-events.
const TRACKED_FIELDS = ['title', 'description', 'priority', 'columnId', 'assigneeId', 'status', 'deadline'] as const;

@Injectable()
export class TasksService implements OnModuleInit {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    @InjectRepository(Task) private tasks: Repository<Task>,
    @InjectRepository(Subtask) private subtasks: Repository<Subtask>,
    @InjectRepository(Comment) private comments: Repository<Comment>,
    @InjectRepository(TaskHistory) private history: Repository<TaskHistory>,
    private redis: RedisService,
    @Inject('KAFKA_CLIENT') private readonly kafka: ClientKafka,
    private readonly projectsClient: ProjectsClientService,
  ) {}

  async onModuleInit() {
    try {
      await this.kafka.connect();
      this.logger.log('Kafka producer connected');
    } catch (err) {
      this.logger.error('Kafka producer failed to connect', err);
    }
  }

  // --- Tasks ------------------------------------------------------------
  async create(dto: CreateTaskDto, reporterId: string, authHeader?: string) {
    await this.projectsClient.assertMember(dto.projectId, reporterId, authHeader);

    const task = await this.tasks.save(
      this.tasks.create({
        ...dto,
        deadline: dto.deadline ? new Date(dto.deadline) : null,
        reporterId,
      }),
    );
    await this.history.save(
      this.history.create({ taskId: task.id, userId: reporterId, field: 'created', newValue: task.title }),
    );
    this.publish('TaskCreated', task);
    await this.invalidateCache(task.projectId);
    return this.findOne(task.id, reporterId, authHeader);
  }

  async findAllByProject(projectId: string, userId: string, authHeader?: string) {
    await this.projectsClient.assertMember(projectId, userId, authHeader);

    const cacheKey = `${CACHE_PREFIX}project:${projectId}`;
    const cached = await this.redis.get<Task[]>(cacheKey);
    if (cached) return cached;

    const result = await this.tasks.find({ where: { projectId }, order: { createdAt: 'DESC' } });
    await this.redis.set(cacheKey, result, CACHE_TTL_SECONDS);
    return result;
  }

  async findOne(id: string, userId: string, authHeader?: string) {
    const cacheKey = `${CACHE_PREFIX}detail:${id}`;
    const cached = await this.redis.get<Task>(cacheKey);
    if (cached) {
      await this.projectsClient.assertMember(cached.projectId, userId, authHeader);
      return cached;
    }

    const task = await this.tasks.findOne({
      where: { id },
      relations: ['subtasks', 'comments', 'history'],
    });
    if (!task) throw new NotFoundException('Task not found');
    await this.projectsClient.assertMember(task.projectId, userId, authHeader);
    await this.redis.set(cacheKey, task, CACHE_TTL_SECONDS);
    return task;
  }

  async update(id: string, dto: UpdateTaskDto, userId: string, authHeader?: string) {
    const task = await this.getOrThrow(id);
    await this.projectsClient.assertMember(task.projectId, userId, authHeader);
    const changes: Record<string, unknown> = { ...dto };
    if (dto.deadline !== undefined) changes.deadline = dto.deadline ? new Date(dto.deadline) : null;

    const changedFields: string[] = [];
    for (const field of TRACKED_FIELDS) {
      if (!(field in changes)) continue;
      const oldValue = (task as any)[field];
      const newValue = changes[field];
      const oldComparable = oldValue instanceof Date ? oldValue.toISOString() : oldValue;
      const newComparable = newValue instanceof Date ? newValue.toISOString() : newValue;
      if (oldComparable === newComparable) continue;

      changedFields.push(field);
      await this.history.save(
        this.history.create({
          taskId: id,
          userId,
          field,
          oldValue: oldComparable != null ? String(oldComparable) : null,
          newValue: newComparable != null ? String(newComparable) : null,
        }),
      );
      (task as any)[field] = newValue;
    }

    await this.tasks.save(task);
    await this.invalidateCache(task.projectId, id);

    if (changedFields.includes('status')) {
      this.publish('TaskStatusChanged', task, { previousStatus: dto.status });
    }
    if (changedFields.includes('assigneeId') && task.assigneeId) {
      this.publish('TaskAssigned', task);
    }
    return this.findOne(id, userId, authHeader);
  }

  async remove(id: string, userId: string, authHeader?: string) {
    const task = await this.getOrThrowWithAccess(id, userId, authHeader);
    await this.tasks.remove(task);
    await this.invalidateCache(task.projectId, id);
    return { message: 'Task deleted' };
  }

  // --- Subtasks -------------------------------------------------------------
  async addSubtask(taskId: string, dto: CreateSubtaskDto, userId: string, authHeader?: string) {
    const task = await this.getOrThrowWithAccess(taskId, userId, authHeader);
    const subtask = await this.subtasks.save(this.subtasks.create({ taskId, title: dto.title }));
    await this.invalidateCache(task.projectId, taskId);
    return subtask;
  }

  async listSubtasks(taskId: string, userId: string, authHeader?: string) {
    await this.getOrThrowWithAccess(taskId, userId, authHeader);
    return this.subtasks.find({ where: { taskId } });
  }

  async updateSubtask(taskId: string, subtaskId: string, dto: UpdateSubtaskDto, userId: string, authHeader?: string) {
    const task = await this.getOrThrowWithAccess(taskId, userId, authHeader);
    const subtask = await this.getSubtaskOrThrow(taskId, subtaskId);
    Object.assign(subtask, dto);
    const saved = await this.subtasks.save(subtask);
    await this.invalidateCache(task.projectId, taskId);
    return saved;
  }

  async removeSubtask(taskId: string, subtaskId: string, userId: string, authHeader?: string) {
    const task = await this.getOrThrowWithAccess(taskId, userId, authHeader);
    const subtask = await this.getSubtaskOrThrow(taskId, subtaskId);
    await this.subtasks.remove(subtask);
    await this.invalidateCache(task.projectId, taskId);
    return { message: 'Subtask deleted' };
  }

  // --- Comments -------------------------------------------------------------
  async addComment(taskId: string, dto: CreateCommentDto, authorId: string, authHeader?: string) {
    const task = await this.getOrThrowWithAccess(taskId, authorId, authHeader);
    const comment = await this.comments.save(this.comments.create({ taskId, authorId, content: dto.content }));
    await this.invalidateCache(task.projectId, taskId);
    return comment;
  }

  async listComments(taskId: string, userId: string, authHeader?: string) {
    await this.getOrThrowWithAccess(taskId, userId, authHeader);
    return this.comments.find({ where: { taskId }, order: { createdAt: 'ASC' } });
  }

  // --- History ----------------------------------------------------------------
  async listHistory(taskId: string, userId: string, authHeader?: string) {
    await this.getOrThrowWithAccess(taskId, userId, authHeader);
    return this.history.find({ where: { taskId }, order: { createdAt: 'DESC' } });
  }

  // --- Helpers --------------------------------------------------------------
  private async getOrThrow(id: string) {
    const task = await this.tasks.findOne({ where: { id } });
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  // Loads the task and checks the caller is a member of the project it
  // belongs to. Every subtask/comment/history route keys off a task id, so
  // this one helper is the single choke point that closes off "any valid
  // token can read/edit/delete any other user's resources" for all of them.
  private async getOrThrowWithAccess(id: string, userId: string, authHeader?: string) {
    const task = await this.getOrThrow(id);
    await this.projectsClient.assertMember(task.projectId, userId, authHeader);
    return task;
  }

  private async getSubtaskOrThrow(taskId: string, subtaskId: string) {
    const subtask = await this.subtasks.findOne({ where: { id: subtaskId, taskId } });
    if (!subtask) throw new NotFoundException('Subtask not found on this task');
    return subtask;
  }

  // Coarse invalidation: any write clears the project's board cache and the
  // task's own detail cache. Simple and correct — this is board caching, not
  // a source of truth.
  private invalidateCache(projectId: string, taskId?: string) {
    const jobs = [this.redis.delByPrefix(`${CACHE_PREFIX}project:${projectId}`)];
    if (taskId) jobs.push(this.redis.delByPrefix(`${CACHE_PREFIX}detail:${taskId}`));
    return Promise.all(jobs);
  }

  // Publishes to the task-events topic. Payloads are kept small and
  // documented in the README — consumers (Notification Service) only need
  // enough to build a notification, not the full task.
  publish(event: string, task: Task, extra: Record<string, unknown> = {}) {
    const payload = {
      event,
      taskId: task.id,
      projectId: task.projectId,
      title: task.title,
      assignedUser: task.assigneeId ?? null,
      status: task.status,
      deadline: task.deadline,
      ...extra,
    };
    this.kafka.emit('task-events', payload).subscribe({
      error: (err) => this.logger.error(`Failed to publish ${event}`, err),
    });
  }
}
