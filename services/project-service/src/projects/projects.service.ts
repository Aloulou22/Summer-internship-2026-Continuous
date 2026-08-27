import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from './entities/project.entity';
import { ProjectMember, ProjectMemberRole } from './entities/project-member.entity';
import { BoardColumn } from './entities/board-column.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { CreateBoardColumnDto } from './dto/create-board-column.dto';
import { UpdateBoardColumnDto } from './dto/update-board-column.dto';
import { RedisService } from '../redis/redis.service';

const CACHE_PREFIX = 'project-service:projects:';
const CACHE_TTL_SECONDS = 30;
const DEFAULT_COLUMNS = ['To Do', 'In Progress', 'Done'];

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project) private projects: Repository<Project>,
    @InjectRepository(ProjectMember) private members: Repository<ProjectMember>,
    @InjectRepository(BoardColumn) private columns: Repository<BoardColumn>,
    private redis: RedisService,
  ) {}

  // --- Projects ---------------------------------------------------------
  async create(dto: CreateProjectDto, ownerId: string) {
    const project = await this.projects.save(
      this.projects.create({ ...dto, ownerId }),
    );
    await this.members.save(
      this.members.create({ projectId: project.id, userId: ownerId, role: ProjectMemberRole.OWNER }),
    );
    await this.columns.save(
      DEFAULT_COLUMNS.map((name, position) =>
        this.columns.create({ projectId: project.id, name, position }),
      ),
    );
    await this.invalidateCache();
    return this.findOne(project.id);
  }

  async findAllForUser(userId: string) {
    const cacheKey = `${CACHE_PREFIX}list:${userId}`;
    const cached = await this.redis.get<Project[]>(cacheKey);
    if (cached) return cached;

    const memberships = await this.members.find({ where: { userId } });
    const projectIds = memberships.map((m) => m.projectId);
    if (!projectIds.length) return [];

    const result = await this.projects.find({
      where: projectIds.map((id) => ({ id })),
      relations: ['category'],
      order: { createdAt: 'DESC' },
    });
    await this.redis.set(cacheKey, result, CACHE_TTL_SECONDS);
    return result;
  }

  async findOne(id: string) {
    const cacheKey = `${CACHE_PREFIX}detail:${id}`;
    const cached = await this.redis.get<Project>(cacheKey);
    if (cached) return cached;

    const project = await this.projects.findOne({
      where: { id },
      relations: ['category', 'members', 'columns'],
    });
    if (!project) throw new NotFoundException('Project not found');
    await this.redis.set(cacheKey, project, CACHE_TTL_SECONDS);
    return project;
  }

  async update(id: string, dto: UpdateProjectDto) {
    const project = await this.getOrThrow(id);
    Object.assign(project, dto);
    await this.projects.save(project);
    await this.invalidateCache();
    return this.findOne(id);
  }

  async remove(id: string) {
    const project = await this.getOrThrow(id);
    await this.projects.remove(project);
    await this.invalidateCache();
    return { message: 'Project deleted' };
  }

  // --- Members ------------------------------------------------------------
  async addMember(projectId: string, dto: AddMemberDto) {
    await this.getOrThrow(projectId);
    const existing = await this.members.findOne({ where: { projectId, userId: dto.userId } });
    if (existing) throw new ConflictException('User is already a member of this project');
    const member = await this.members.save(
      this.members.create({ projectId, userId: dto.userId, role: dto.role }),
    );
    await this.invalidateCache();
    return member;
  }

  listMembers(projectId: string) {
    return this.members.find({ where: { projectId } });
  }

  async updateMemberRole(projectId: string, userId: string, dto: UpdateMemberDto) {
    const member = await this.getMemberOrThrow(projectId, userId);
    member.role = dto.role;
    const saved = await this.members.save(member);
    await this.invalidateCache();
    return saved;
  }

  async removeMember(projectId: string, userId: string) {
    const member = await this.getMemberOrThrow(projectId, userId);
    await this.members.remove(member);
    await this.invalidateCache();
    return { message: 'Member removed' };
  }

  // --- Kanban columns -------------------------------------------------------
  async addColumn(projectId: string, dto: CreateBoardColumnDto) {
    await this.getOrThrow(projectId);
    const column = await this.columns.save(
      this.columns.create({ projectId, name: dto.name, position: dto.position ?? 0 }),
    );
    await this.invalidateCache();
    return column;
  }

  listColumns(projectId: string) {
    return this.columns.find({ where: { projectId }, order: { position: 'ASC' } });
  }

  async updateColumn(projectId: string, columnId: string, dto: UpdateBoardColumnDto) {
    const column = await this.getColumnOrThrow(projectId, columnId);
    Object.assign(column, dto);
    const saved = await this.columns.save(column);
    await this.invalidateCache();
    return saved;
  }

  async removeColumn(projectId: string, columnId: string) {
    const column = await this.getColumnOrThrow(projectId, columnId);
    await this.columns.remove(column);
    await this.invalidateCache();
    return { message: 'Column deleted' };
  }

  // --- Helpers --------------------------------------------------------------
  private async getOrThrow(id: string) {
    const project = await this.projects.findOne({ where: { id } });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  private async getMemberOrThrow(projectId: string, userId: string) {
    const member = await this.members.findOne({ where: { projectId, userId } });
    if (!member) throw new NotFoundException('Member not found on this project');
    return member;
  }

  private async getColumnOrThrow(projectId: string, columnId: string) {
    const column = await this.columns.findOne({ where: { id: columnId, projectId } });
    if (!column) throw new NotFoundException('Column not found on this project');
    return column;
  }

  // Coarse invalidation: any write clears the whole projects cache namespace.
  // Simple and correct — this is dashboard caching, not a source of truth.
  private invalidateCache() {
    return this.redis.delByPrefix(CACHE_PREFIX);
  }
}
