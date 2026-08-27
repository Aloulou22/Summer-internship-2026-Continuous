import {
  Body, Controller, Delete, Get, Param, Patch, Post, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { CreateBoardColumnDto } from './dto/create-board-column.dto';
import { UpdateBoardColumnDto } from './dto/update-board-column.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { ProjectAccessGuard } from './guards/project-access.guard';
import { ProjectRoles } from './guards/project-roles.decorator';
import { ProjectMemberRole } from './entities/project-member.entity';

const OWNER_OR_ADMIN = [ProjectMemberRole.OWNER, ProjectMemberRole.ADMIN];

@ApiTags('projects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a project (creator becomes the owner member)' })
  create(@Body() dto: CreateProjectDto, @CurrentUser('id') userId: string) {
    return this.projects.create(dto, userId);
  }

  @Get()
  @ApiOperation({ summary: "List the current user's projects" })
  findAllForUser(@CurrentUser('id') userId: string) {
    return this.projects.findAllForUser(userId);
  }

  @Get(':id')
  @UseGuards(ProjectAccessGuard)
  @ApiOperation({ summary: 'Get a project by id, with members and Kanban columns (members only)' })
  findOne(@Param('id') id: string) {
    return this.projects.findOne(id);
  }

  @Patch(':id')
  @UseGuards(ProjectAccessGuard)
  @ProjectRoles(...OWNER_OR_ADMIN)
  @ApiOperation({ summary: 'Update a project (owner/admin only)' })
  update(@Param('id') id: string, @Body() dto: UpdateProjectDto) {
    return this.projects.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(ProjectAccessGuard)
  @ProjectRoles(...OWNER_OR_ADMIN)
  @ApiOperation({ summary: 'Delete a project (owner/admin only)' })
  remove(@Param('id') id: string) {
    return this.projects.remove(id);
  }

  // --- Members ------------------------------------------------------------
  @Post(':id/members')
  @UseGuards(ProjectAccessGuard)
  @ProjectRoles(...OWNER_OR_ADMIN)
  @ApiOperation({ summary: 'Add a member to a project (owner/admin only)' })
  addMember(@Param('id') id: string, @Body() dto: AddMemberDto) {
    return this.projects.addMember(id, dto);
  }

  @Get(':id/members')
  @UseGuards(ProjectAccessGuard)
  @ApiOperation({ summary: 'List project members (members only)' })
  listMembers(@Param('id') id: string) {
    return this.projects.listMembers(id);
  }

  @Patch(':id/members/:userId')
  @UseGuards(ProjectAccessGuard)
  @ProjectRoles(...OWNER_OR_ADMIN)
  @ApiOperation({ summary: "Update a member's role (owner/admin only)" })
  updateMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateMemberDto,
  ) {
    return this.projects.updateMemberRole(id, userId, dto);
  }

  @Delete(':id/members/:userId')
  @UseGuards(ProjectAccessGuard)
  @ProjectRoles(...OWNER_OR_ADMIN)
  @ApiOperation({ summary: 'Remove a member from a project (owner/admin only)' })
  removeMember(@Param('id') id: string, @Param('userId') userId: string) {
    return this.projects.removeMember(id, userId);
  }

  // --- Kanban columns ---------------------------------------------------------
  @Post(':id/columns')
  @UseGuards(ProjectAccessGuard)
  @ApiOperation({ summary: 'Add a Kanban column to a project (members only)' })
  addColumn(@Param('id') id: string, @Body() dto: CreateBoardColumnDto) {
    return this.projects.addColumn(id, dto);
  }

  @Get(':id/columns')
  @UseGuards(ProjectAccessGuard)
  @ApiOperation({ summary: "List a project's Kanban columns (members only)" })
  listColumns(@Param('id') id: string) {
    return this.projects.listColumns(id);
  }

  @Patch(':id/columns/:columnId')
  @UseGuards(ProjectAccessGuard)
  @ApiOperation({ summary: 'Update a Kanban column (members only)' })
  updateColumn(
    @Param('id') id: string,
    @Param('columnId') columnId: string,
    @Body() dto: UpdateBoardColumnDto,
  ) {
    return this.projects.updateColumn(id, columnId, dto);
  }

  @Delete(':id/columns/:columnId')
  @UseGuards(ProjectAccessGuard)
  @ApiOperation({ summary: 'Delete a Kanban column (members only)' })
  removeColumn(@Param('id') id: string, @Param('columnId') columnId: string) {
    return this.projects.removeColumn(id, columnId);
  }
}
