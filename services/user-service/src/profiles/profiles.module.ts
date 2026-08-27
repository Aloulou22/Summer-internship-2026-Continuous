import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProfilesService } from './profiles.service';
import { ProfilesController } from './profiles.controller';
import { UserEventsController } from './user-events.controller';
import { Profile } from './entities/profile.entity';
import { SelfOrAdminGuard } from './guards/self-or-admin.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Profile])],
  // Two controllers: one for HTTP routes, one for Kafka events.
  controllers: [ProfilesController, UserEventsController],
  providers: [ProfilesService, SelfOrAdminGuard],
  exports: [ProfilesService],
})
export class ProfilesModule {}
