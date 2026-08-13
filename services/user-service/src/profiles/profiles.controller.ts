import {
  Body, Controller, Delete, Get, Param, Patch, Post, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProfilesService } from './profiles.service';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@ApiTags('profiles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard) // every route here needs a valid JWT from Auth
@Controller('profiles')
export class ProfilesController {
  constructor(private readonly profiles: ProfilesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a profile' })
  create(@Body() dto: CreateProfileDto) {
    return this.profiles.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all profiles' })
  findAll() {
    return this.profiles.findAll();
  }

  @Get('me')
  @ApiOperation({ summary: 'Get my own profile (from the JWT)' })
  me(@CurrentUser('id') userId: string) {
    return this.profiles.findByUserId(userId);
  }

  @Get(':userId')
  @ApiOperation({ summary: 'Get a profile by user id' })
  findOne(@Param('userId') userId: string) {
    return this.profiles.findByUserId(userId);
  }

  @Patch(':userId')
  @ApiOperation({ summary: 'Update a profile' })
  update(@Param('userId') userId: string, @Body() dto: UpdateProfileDto) {
    return this.profiles.update(userId, dto);
  }

  @Delete(':userId')
  @ApiOperation({ summary: 'Delete a profile' })
  remove(@Param('userId') userId: string) {
    return this.profiles.remove(userId);
  }
}
