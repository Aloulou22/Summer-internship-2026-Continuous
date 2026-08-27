import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { NotificationsService } from './notifications.service';

// No HTTP routes. Listens to the task-events topic Task Service publishes
// to (TaskCreated, TaskAssigned, TaskStatusChanged, TaskDeadlineReminder).
@Controller()
export class TaskEventsController {
  private readonly logger = new Logger(TaskEventsController.name);

  constructor(private readonly notifications: NotificationsService) {}

  @EventPattern('task-events')
  async handleTaskEvent(@Payload() data: any) {
    this.logger.log(`Received task-events: ${data.event} for taskId=${data.taskId}`);
    await this.notifications.handleTaskEvent(data);
  }
}
