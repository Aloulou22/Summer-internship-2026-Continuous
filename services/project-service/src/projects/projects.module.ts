import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { Project } from './entities/project.entity';
import { ProjectMember } from './entities/project-member.entity';
import { BoardColumn } from './entities/board-column.entity';
import { ProjectAccessGuard } from './guards/project-access.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Project, ProjectMember, BoardColumn])],
  controllers: [ProjectsController],
  providers: [ProjectsService, ProjectAccessGuard],
  exports: [ProjectsService],
})
export class ProjectsModule {}
