import {
  Injectable,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
  OnModuleInit,
  Inject,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ClientKafka } from '@nestjs/microservices';
import * as bcrypt from 'bcrypt';
import { randomBytes, createHash } from 'crypto';

import { User, UserRole } from '../users/entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private usersRepo: Repository<User>,
    @InjectRepository(RefreshToken)
    private tokensRepo: Repository<RefreshToken>,
    private jwt: JwtService,
    private config: ConfigService,
    @Inject('KAFKA_CLIENT') private readonly kafka: ClientKafka,
  ) {}

  // Connect the Kafka producer once when the module starts.
  async onModuleInit() {
    try {
      await this.kafka.connect();
      this.logger.log('Kafka producer connected');
    } catch (err) {
      this.logger.error('Kafka producer failed to connect', err);
    }
    await this.bootstrapAdmin();
  }

  // Registration always yields role=member (see register() below), and there
  // is otherwise no endpoint that can grant admin — updateRole() itself is
  // admin-only. Without this, the very first admin could only be created by
  // editing the database directly. Set ADMIN_EMAIL/ADMIN_PASSWORD to have
  // this account created (or an existing one promoted) on every startup;
  // leave them unset to skip this entirely. Safe to run on every restart —
  // it's a no-op once that account is already an admin.
  private async bootstrapAdmin(): Promise<void> {
    const email = this.config.get<string>('ADMIN_EMAIL');
    const password = this.config.get<string>('ADMIN_PASSWORD');
    if (!email || !password) return;

    const existing = await this.usersRepo.findOne({ where: { email } });
    if (existing) {
      if (existing.role !== UserRole.ADMIN) {
        existing.role = UserRole.ADMIN;
        await this.usersRepo.save(existing);
        this.logger.log(`Promoted ${email} to admin (ADMIN_EMAIL bootstrap)`);
      }
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const admin = this.usersRepo.create({
      email,
      passwordHash,
      fullName: 'Administrator',
      role: UserRole.ADMIN,
    });
    await this.usersRepo.save(admin);
    this.publishUserRegistered(admin);
    this.logger.log(`Created bootstrap admin account ${email}`);
  }

  // --- Registration ---------------------------------------------------------
  async register(dto: RegisterDto) {
    const existing = await this.usersRepo.findOne({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException('Email already in use');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = this.usersRepo.create({
      email: dto.email,
      passwordHash,
      fullName: dto.fullName,
    });
    await this.usersRepo.save(user);

    // Publish the event. Other services (User, Notification...) react to this
    // WITHOUT Auth knowing they exist. This is the event-driven decoupling.
    this.publishUserRegistered(user);

    return this.issueTokens(user);
  }

  private publishUserRegistered(user: User) {
    const payload = {
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
    };
    // Fire-and-forget: a Kafka hiccup must not fail the user's registration.
    this.kafka.emit('user.registered', payload).subscribe({
      error: (err) =>
        this.logger.error('Failed to publish user.registered', err),
    });
  }

  // --- Login ----------------------------------------------------------------
  async login(dto: LoginDto) {
    const user = await this.usersRepo.findOne({ where: { email: dto.email } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');
    return this.issueTokens(user);
  }

  // --- Refresh --------------------------------------------------------------
  async refresh(rawToken: string) {
    const tokenHash = this.hashToken(rawToken);
    const stored = await this.tokensRepo.findOne({
      where: { tokenHash },
      relations: ['user'],
    });
    if (!stored || stored.revoked || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    stored.revoked = true;
    await this.tokensRepo.save(stored);
    return this.issueTokens(stored.user);
  }

  // --- Logout ---------------------------------------------------------------
  async logout(rawToken: string) {
    const tokenHash = this.hashToken(rawToken);
    await this.tokensRepo.update({ tokenHash }, { revoked: true });
    return { message: 'Logged out' };
  }

  // --- Platform role management (admin only, see auth.controller.ts) -------
  async listUsers() {
    const users = await this.usersRepo.find({ order: { createdAt: 'ASC' } });
    return users.map((u) => this.toPublicUser(u));
  }

  async updateRole(id: string, role: UserRole, currentUserId: string) {
    if (id === currentUserId) {
      throw new ForbiddenException("You can't change your own role");
    }
    const user = await this.usersRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    user.role = role;
    await this.usersRepo.save(user);
    return this.toPublicUser(user);
  }

  private toPublicUser(user: User) {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
    };
  }

  // --- Helpers --------------------------------------------------------------
  private async issueTokens(user: User) {
    const payload = { sub: user.id, email: user.email, role: user.role };

    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.config.get<string>('JWT_ACCESS_TTL'),
    });

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

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
