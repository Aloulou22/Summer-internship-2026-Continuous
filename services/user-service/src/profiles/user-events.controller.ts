import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { ProfilesService } from './profiles.service';

// This controller has NO HTTP routes. It only listens to Kafka topics.
// @EventPattern subscribes to a topic and fires when a matching event arrives.
// This is the "microservice transport" style you saw in tutorials.
@Controller()
export class UserEventsController {
  private readonly logger = new Logger(UserEventsController.name);

  constructor(private readonly profiles: ProfilesService) {}

  @EventPattern('user.registered')
  async handleUserRegistered(
    @Payload() data: { userId: string; email: string; fullName: string },
  ) {
    this.logger.log(`Received user.registered for ${data.email}`);
    // Auto-create the profile that Auth's new user needs.
    await this.profiles.createFromEvent(data.userId, data.fullName);
    this.logger.log(`Profile auto-created for userId=${data.userId}`);
  }
}
