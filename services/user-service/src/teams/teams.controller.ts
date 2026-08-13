import {
  Body, Controller, Delete, Get, Param, Patch, Post, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TeamsService } from './teams.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('teams')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('teams')
export class TeamsController {
  constructor(private readonly teams: TeamsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a team' })
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
  @ApiOperation({ summary: 'Update a team' })
  update(@Param('id') id: string, @Body() dto: UpdateTeamDto) {
    return this.teams.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a team' })
  remove(@Param('id') id: string) {
    return this.teams.remove(id);
  }
}
