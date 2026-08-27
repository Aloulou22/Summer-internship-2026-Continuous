import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { TaskEventsController } from './task-events.controller';
import { UserEventsController } from './user-events.controller';
import { Notification } from './entities/notification.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Notification])],
  // Three controllers: one for HTTP routes, two for Kafka events.
  controllers: [NotificationsController, TaskEventsController, UserEventsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
