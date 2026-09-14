import {
  Body, Controller, Delete, Get, Param, Patch, Post, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TeamsService } from './teams.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { AddTeamMemberDto } from './dto/add-team-member.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

// Teams have no per-team role concept (Profile.team is a plain many-to-one,
// no membership/role table) — so unlike projects there's no "team owner" to
// defer to. Mutating a team is restricted to platform admins; reading stays
// open so anyone can browse teams to see who's on them.
@ApiTags('teams')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('teams')
export class TeamsController {
  constructor(private readonly teams: TeamsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Create a team (admin only)' })
  create(@Body() dto: CreateTeamDto) {
    return this.teams.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all teams' })
  findAll() {
    return this.teams.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a team by id' })
  findOne(@Param('id') id: string) {
    return this.teams.findOne(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Update a team (admin only)' })
  update(@Param('id') id: string, @Body() dto: UpdateTeamDto) {
    return this.teams.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Delete a team (admin only)' })
  remove(@Param('id') id: string) {
    return this.teams.remove(id);
  }

  // Dedicated endpoints rather than letting PATCH /profiles/:userId set
  // teamId: that route lets any user edit their own profile, which would let
  // anyone put themselves on any team. Team membership stays admin-only, same
  // as every other team mutation.
  @Post(':id/members')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Add a user to a team, moving them off any other team (admin only)' })
  addMember(@Param('id') id: string, @Body() dto: AddTeamMemberDto) {
    return this.teams.addMember(id, dto.userId);
  }

  @Delete(':id/members/:userId')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Remove a user from a team (admin only)' })
  removeMember(@Param('id') id: string, @Param('userId') userId: string) {
    return this.teams.removeMember(id, userId);
  }
}
