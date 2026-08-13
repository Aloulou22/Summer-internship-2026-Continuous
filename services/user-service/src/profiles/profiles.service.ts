import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Profile } from './entities/profile.entity';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class ProfilesService {
  constructor(
    @InjectRepository(Profile)
    private repo: Repository<Profile>,
  ) {}

  async create(dto: CreateProfileDto) {
    const existing = await this.repo.findOne({ where: { userId: dto.userId } });
    if (existing) throw new ConflictException('Profile already exists for this user');
    return this.repo.save(this.repo.create(dto));
  }

  findAll() {
    return this.repo.find({ relations: ['team'] });
  }

  async findByUserId(userId: string) {
    const profile = await this.repo.findOne({ where: { userId }, relations: ['team'] });
    if (!profile) throw new NotFoundException('Profile not found');
    return profile;
  }

  async update(userId: string, dto: UpdateProfileDto) {
    const profile = await this.findByUserId(userId);
    Object.assign(profile, dto);
    return this.repo.save(profile);
  }

  async remove(userId: string) {
    const profile = await this.findByUserId(userId);
    await this.repo.remove(profile);
    return { message: 'Profile deleted' };
  }

  // Called by the Kafka consumer (next step) when Auth publishes a new user.
  async createFromEvent(userId: string, fullName: string) {
    const existing = await this.repo.findOne({ where: { userId } });
    if (existing) return existing;
    return this.repo.save(this.repo.create({ userId, fullName }));
  }
}
