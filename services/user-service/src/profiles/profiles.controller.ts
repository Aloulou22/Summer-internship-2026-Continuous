import {
  Body, Controller, Delete, ForbiddenException, Get, Param, Patch, Post, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProfilesService } from './profiles.service';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { SelfOrAdminGuard } from './guards/self-or-admin.guard';

@ApiTags('profiles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard) // every route here needs a valid JWT from Auth
@Controller('profiles')
export class ProfilesController {
  constructor(private readonly profiles: ProfilesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a profile (must be your own — dto.userId must match the caller)' })
  create(@Body() dto: CreateProfileDto, @CurrentUser() user: any) {
    if (dto.userId !== user.id && user.role !== 'admin') {
      throw new ForbiddenException('You can only create your own profile');
    }
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
  @UseGuards(SelfOrAdminGuard)
  @ApiOperation({ summary: 'Update a profile (own profile or admin only)' })
  update(@Param('userId') userId: string, @Body() dto: UpdateProfileDto) {
    return this.profiles.update(userId, dto);
  }

  @Delete(':userId')
  @UseGuards(SelfOrAdminGuard)
  @ApiOperation({ summary: 'Delete a profile (own profile or admin only)' })
  remove(@Param('userId') userId: string) {
    return this.profiles.remove(userId);
  }
}
