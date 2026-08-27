import {
  Body, Controller, Get, Param, Patch, Post, Req, Res, UnauthorizedException, UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request, Response } from 'express';

import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { UserRole } from '../users/entities/user.entity';

const REFRESH_COOKIE = 'refreshToken';
// Scoped to /auth so the cookie is never sent on unrelated API calls — only
// the endpoints below (refresh/logout) ever need to read it.
const REFRESH_COOKIE_PATH = '/auth';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Create a new account and return a token pair (refresh token also set as an httpOnly cookie)' })
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.register(dto);
    this.setRefreshCookie(res, result.refreshToken);
    return result;
  }

  @Post('login')
  @ApiOperation({ summary: 'Authenticate and return a token pair (refresh token also set as an httpOnly cookie)' })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.login(dto);
    this.setRefreshCookie(res, result.refreshToken);
    return result;
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Exchange a refresh token (body or cookie) for a new token pair' })
  async refresh(
    @Body() dto: RefreshDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const rawToken = dto.refreshToken ?? req.cookies?.[REFRESH_COOKIE];
    if (!rawToken) throw new UnauthorizedException('No refresh token provided');
    const result = await this.auth.refresh(rawToken);
    this.setRefreshCookie(res, result.refreshToken);
    return result;
  }

  @Post('logout')
  @ApiOperation({ summary: 'Revoke the given refresh token (body or cookie) and clear the cookie' })
  async logout(
    @Body() dto: RefreshDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const rawToken = dto.refreshToken ?? req.cookies?.[REFRESH_COOKIE];
    const result = rawToken
      ? await this.auth.logout(rawToken)
      : { message: 'Logged out' };
    res.clearCookie(REFRESH_COOKIE, { path: REFRESH_COOKIE_PATH });
    return result;
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Return the currently authenticated user' })
  me(@CurrentUser() user: any) {
    return user;
  }

  @Get('users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all platform accounts, with their role (admin only)' })
  listUsers() {
    return this.auth.listUsers();
  }

  @Patch('users/:id/role')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Change a user's platform role (admin only)" })
  updateRole(
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
    @CurrentUser('id') currentUserId: string,
  ) {
    return this.auth.updateRole(id, dto.role, currentUserId);
  }

  // Kept httpOnly so page script (and therefore XSS) can never read it —
  // the whole point of moving it out of "JSON body only". Still returned in
  // the JSON body too, for non-browser clients (Postman, CLI tools, tests).
  private setRefreshCookie(res: Response, token: string) {
    const days = Number(this.config.get<string>('REFRESH_TTL_DAYS'));
    const isProd = this.config.get<string>('NODE_ENV') === 'production';
    res.cookie(REFRESH_COOKIE, token, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: REFRESH_COOKIE_PATH,
      maxAge: days * 24 * 60 * 60 * 1000,
    });
  }
}
