import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeamsService } from './teams.service';
import { TeamsController } from './teams.controller';
import { Team } from './entities/team.entity';
import { Profile } from '../profiles/entities/profile.entity';
import { RolesGuard } from '../auth/roles.guard';

@Module({
  // Profile is needed here because team membership lives on Profile.teamId.
  imports: [TypeOrmModule.forFeature([Team, Profile])],
  controllers: [TeamsController],
  providers: [TeamsService, RolesGuard],
  exports: [TeamsService],
})
export class TeamsModule {}
