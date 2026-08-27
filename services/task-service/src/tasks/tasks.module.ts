import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { DeadlineReminderScheduler } from './deadline-reminder.scheduler';
import { Task } from './entities/task.entity';
import { Subtask } from './entities/subtask.entity';
import { Comment } from './entities/comment.entity';
import { TaskHistory } from './entities/task-history.entity';
import { KafkaModule } from '../kafka/kafka.module';
import { ProjectsClientModule } from '../projects/projects-client.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Task, Subtask, Comment, TaskHistory]),
    KafkaModule,
    ProjectsClientModule,
  ],
  controllers: [TasksController],
  providers: [TasksService, DeadlineReminderScheduler],
  exports: [TasksService],
})
export class TasksModule {}
