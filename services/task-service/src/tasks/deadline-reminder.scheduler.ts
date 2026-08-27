import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Not, Repository } from 'typeorm';
import { ClientKafka } from '@nestjs/microservices';
import { Task, TaskStatus } from './entities/task.entity';

// Sweeps for tasks whose deadline falls within the next 24h and publishes a
// TaskDeadlineReminder once per task (reminderSent guards against repeats).
// This is what turns "rappels des échéances" into a task-events message the
// Notification Service can react to, without Notification needing to poll
// Task Service's database directly.
@Injectable()
export class DeadlineReminderScheduler {
  private readonly logger = new Logger(DeadlineReminderScheduler.name);

  constructor(
    @InjectRepository(Task) private tasks: Repository<Task>,
    @Inject('KAFKA_CLIENT') private readonly kafka: ClientKafka,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async sweep() {
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const due = await this.tasks.find({
      where: {
        deadline: Between(now, in24h),
        reminderSent: false,
        status: Not(TaskStatus.DONE),
      },
    });

    for (const task of due) {
      const payload = {
        event: 'TaskDeadlineReminder',
        taskId: task.id,
        projectId: task.projectId,
        title: task.title,
        assignedUser: task.assigneeId ?? null,
        deadline: task.deadline,
      };
      this.kafka.emit('task-events', payload).subscribe({
        error: (err) => this.logger.error('Failed to publish TaskDeadlineReminder', err),
      });
      await this.tasks.update(task.id, { reminderSent: true });
    }

    if (due.length) this.logger.log(`Published ${due.length} deadline reminder(s)`);
  }
}
