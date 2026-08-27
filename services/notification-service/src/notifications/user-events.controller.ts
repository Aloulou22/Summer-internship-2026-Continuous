import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { NotificationsService } from './notifications.service';

// No HTTP routes. Listens to the same user.registered topic User Service
// consumes to auto-create a profile — here it triggers a welcome notification.
@Controller()
export class UserEventsController {
  private readonly logger = new Logger(UserEventsController.name);

  constructor(private readonly notifications: NotificationsService) {}

  @EventPattern('user.registered')
  async handleUserRegistered(
    @Payload() data: { userId: string; email: string; fullName: string },
  ) {
    this.logger.log(`Received user.registered for ${data.email}`);
    await this.notifications.handleUserRegistered(data);
  }
}
