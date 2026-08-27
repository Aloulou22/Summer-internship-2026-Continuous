import {
  Injectable, CanActivate, ExecutionContext, ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Reflector } from '@nestjs/core';
import { ProjectMember } from '../entities/project-member.entity';
import { PROJECT_ROLES_KEY } from './project-roles.decorator';

// Every route this guards out has the project id as the `:id` route param
// (/projects/:id, /projects/:id/members, /projects/:id/columns/:columnId,
// ...) — that's what makes one guard reusable across all of them.
//
// Closes the "any valid token can read/edit/delete any other user's
// resources" gap for projects: membership is required just to view a
// project, and an optional @ProjectRoles(...) on top of that restricts
// mutating routes (delete project, manage members) to OWNER/ADMIN.
@Injectable()
export class ProjectAccessGuard implements CanActivate {
  constructor(
    @InjectRepository(ProjectMember) private members: Repository<ProjectMember>,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const projectId: string = request.params.id;
    const userId: string | undefined = request.user?.id;

    const member = await this.members.findOne({ where: { projectId, userId } });
    if (!member) {
      throw new ForbiddenException('You are not a member of this project');
    }

    const requiredRoles = this.reflector.getAllAndOverride<string[]>(PROJECT_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (requiredRoles?.length && !requiredRoles.includes(member.role)) {
      throw new ForbiddenException('Insufficient project role');
    }

    request.projectMember = member;
    return true;
  }
}
