import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from './entities/notification.entity';

// Shape published by Task Service on the task-events topic. Kept loose
// ("event" is the discriminator) because different event types carry
// different extra fields — see task-service/README.md for the documented
// payloads.
interface TaskEvent {
  event: 'TaskCreated' | 'TaskStatusChanged' | 'TaskAssigned' | 'TaskDeadlineReminder';
  taskId: string;
  projectId: string;
  title: string;
  assignedUser: string | null;
  status?: string;
  previousStatus?: string;
  deadline?: string;
}

interface UserRegisteredEvent {
  userId: string;
  email: string;
  fullName: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification) private repo: Repository<Notification>,
  ) {}

  // --- Kafka-driven creation --------------------------------------------------
  async handleTaskEvent(payload: TaskEvent) {
    // No assignee, no one to notify (e.g. an unassigned TaskCreated).
    if (!payload.assignedUser) return;

    switch (payload.event) {
      case 'TaskCreated':
      case 'TaskAssigned':
        await this.create({
          userId: payload.assignedUser,
          type: NotificationType.TASK_ASSIGNED,
          title: 'New task assigned',
          message: `You were assigned to "${payload.title}"`,
          metadata: { taskId: payload.taskId, projectId: payload.projectId },
        });
        break;
      case 'TaskStatusChanged':
        await this.create({
          userId: payload.assignedUser,
          type: NotificationType.TASK_STATUS_CHANGED,
          title: 'Task status changed',
          message: `"${payload.title}" is now ${payload.status}`,
          metadata: { taskId: payload.taskId, projectId: payload.projectId, status: payload.status },
        });
        break;
      case 'TaskDeadlineReminder':
        await this.create({
          userId: payload.assignedUser,
          type: NotificationType.TASK_DEADLINE_REMINDER,
          title: 'Deadline approaching',
          message: `"${payload.title}" is due soon`,
          metadata: { taskId: payload.taskId, projectId: payload.projectId, deadline: payload.deadline },
        });
        break;
      default:
        this.logger.warn(`Ignoring unknown task-events type: ${(payload as any).event}`);
    }
  }

  async handleUserRegistered(payload: UserRegisteredEvent) {
    await this.create({
      userId: payload.userId,
      type: NotificationType.WELCOME,
      title: 'Welcome to TaskFlow',
      message: `Welcome aboard, ${payload.fullName}!`,
    });
  }

  private create(data: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    metadata?: Record<string, unknown>;
  }) {
    return this.repo.save(this.repo.create(data));
  }

  // --- HTTP reads -------------------------------------------------------------
  findAllForUser(userId: string) {
    return this.repo.find({ where: { userId }, order: { createdAt: 'DESC' } });
  }

  countUnread(userId: string) {
    return this.repo.count({ where: { userId, read: false } });
  }

  async markRead(id: string, userId: string) {
    const notification = await this.repo.findOne({ where: { id, userId } });
    if (!notification) throw new NotFoundException('Notification not found');
    notification.read = true;
    return this.repo.save(notification);
  }

  async markAllRead(userId: string) {
    await this.repo.update({ userId, read: false }, { read: true });
    return { message: 'All notifications marked as read' };
  }

  async remove(id: string, userId: string) {
    const notification = await this.repo.findOne({ where: { id, userId } });
    if (!notification) throw new NotFoundException('Notification not found');
    await this.repo.remove(notification);
    return { message: 'Notification deleted' };
  }
}
