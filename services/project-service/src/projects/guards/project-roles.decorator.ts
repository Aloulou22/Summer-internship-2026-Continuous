import { SetMetadata } from '@nestjs/common';
import { ProjectMemberRole } from '../entities/project-member.entity';

// Optional, used alongside ProjectAccessGuard. Omit it and the guard only
// requires membership (any role); add it to also require one of the given
// project-level roles (e.g. only OWNER/ADMIN may delete the project).
export const PROJECT_ROLES_KEY = 'projectRoles';
export const ProjectRoles = (...roles: ProjectMemberRole[]) =>
  SetMetadata(PROJECT_ROLES_KEY, roles);
