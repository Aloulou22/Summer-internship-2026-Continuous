import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Team } from './entities/team.entity';
import { Profile } from '../profiles/entities/profile.entity';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';

@Injectable()
export class TeamsService {
  constructor(
    @InjectRepository(Team)
    private repo: Repository<Team>,
    @InjectRepository(Profile)
    private profiles: Repository<Profile>,
  ) {}

  async create(dto: CreateTeamDto) {
    const existing = await this.repo.findOne({ where: { name: dto.name } });
    if (existing) throw new ConflictException('Team name already taken');
    return this.repo.save(this.repo.create(dto));
  }

  findAll() {
    return this.repo.find({ relations: ['members'] });
  }

  async findOne(id: string) {
    const team = await this.repo.findOne({ where: { id }, relations: ['members'] });
    if (!team) throw new NotFoundException('Team not found');
    return team;
  }

  async update(id: string, dto: UpdateTeamDto) {
    const team = await this.findOne(id);
    Object.assign(team, dto);
    return this.repo.save(team);
  }

  async remove(id: string) {
    const team = await this.findOne(id);
    await this.repo.remove(team);
    return { message: 'Team deleted' };
  }

  // Membership is Profile.teamId — one team per user, no membership table —
  // so adding someone who is already on another team moves them here. Uses
  // update() rather than save() so a loaded `team` relation can never
  // override the new teamId. Returns the team with its refreshed members.
  async addMember(teamId: string, userId: string) {
    await this.findOne(teamId);
    const profile = await this.profiles.findOne({ where: { userId } });
    if (!profile) throw new NotFoundException('Profile not found');
    if (profile.teamId !== teamId) {
      await this.profiles.update({ id: profile.id }, { teamId });
    }
    return this.findOne(teamId);
  }

  async removeMember(teamId: string, userId: string) {
    const profile = await this.profiles.findOne({ where: { userId } });
    if (!profile || profile.teamId !== teamId) {
      throw new NotFoundException('That user is not on this team');
    }
    await this.profiles.update({ id: profile.id }, { teamId: null });
    return this.findOne(teamId);
  }
}
