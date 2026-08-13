import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { randomBytes, createHash } from 'crypto';

import { User } from '../users/entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private usersRepo: Repository<User>,
    @InjectRepository(RefreshToken)
    private tokensRepo: Repository<RefreshToken>,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  // --- Registration ---------------------------------------------------------
  async register(dto: RegisterDto) {
    const existing = await this.usersRepo.findOne({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException('Email already in use');

    // bcrypt generates a UNIQUE random salt per password automatically.
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = this.usersRepo.create({
      email: dto.email,
      passwordHash,
      fullName: dto.fullName,
    });
    await this.usersRepo.save(user);

    return this.issueTokens(user);
  }

  // --- Login ----------------------------------------------------------------
  async login(dto: LoginDto) {
    const user = await this.usersRepo.findOne({
      where: { email: dto.email },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    return this.issueTokens(user);
  }

  // --- Refresh: exchange a valid refresh token for a new token pair ----------
  async refresh(rawToken: string) {
    const tokenHash = this.hashToken(rawToken);
    const stored = await this.tokensRepo.findOne({
      where: { tokenHash },
      relations: ['user'],
    });

    if (!stored || stored.revoked || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Rotation: single-use refresh tokens. Revoke the old one, issue a new pair.
    stored.revoked = true;
    await this.tokensRepo.save(stored);

    return this.issueTokens(stored.user);
  }

  // --- Logout: revoke the presented refresh token ---------------------------
  async logout(rawToken: string) {
    const tokenHash = this.hashToken(rawToken);
    await this.tokensRepo.update({ tokenHash }, { revoked: true });
    return { message: 'Logged out' };
  }

  // --- Helpers --------------------------------------------------------------
  private async issueTokens(user: User) {
    const payload = { sub: user.id, email: user.email, role: user.role };

    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.config.get<string>('JWT_ACCESS_TTL'),
    });

    // The refresh token is a high-entropy random string (opaque, not a JWT).
    const rawRefresh = randomBytes(48).toString('hex');

    const days = Number(this.config.get<string>('REFRESH_TTL_DAYS'));
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);

    await this.tokensRepo.save(
      this.tokensRepo.create({
        tokenHash: this.hashToken(rawRefresh),
        userId: user.id,
        expiresAt,
      }),
    );

    return {
      accessToken,
      refreshToken: rawRefresh,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
    };
  }

  // SHA-256 is the right tool here: the refresh token is already 48 random
  // bytes (high entropy), so it needs no per-value salt. The hash is
  // deterministic, which lets us look the token up in the DB, while the raw
  // value never touches the database. This replaces the earlier fixed-salt
  // bcrypt approach, which was a shortcut, not correct practice.
  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
