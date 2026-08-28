import { ForbiddenException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';

interface ProjectMemberDto {
  userId: string;
}

// Task Service has no membership table of its own (Database per Service —
// project_members lives in Project Service's DB). Enforcing "must be a
// project member" therefore means asking Project Service, using the
// caller's OWN bearer token — Task Service never gets its own service
// credentials, it just forwards the request identity across the boundary.
// Project Service's /projects/:id/members route is itself guarded, so an
// unauthorized caller is rejected there too; this is defense in depth, same
// pattern as the gateway/service JWT double-check.
@Injectable()
export class ProjectsClientService {
  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  async assertMember(projectId: string, userId: string, authHeader?: string): Promise<void> {
    if (!authHeader) throw new ForbiddenException('Missing credentials');

    const baseUrl = this.config.get<string>('PROJECT_SERVICE_URL');
    try {
      const { data } = await firstValueFrom(
        this.http.get<ProjectMemberDto[]>(`${baseUrl}/projects/${projectId}/members`, {
          headers: { Authorization: authHeader },
        }),
      );
      const isMember = data.some((member) => member.userId === userId);
      if (!isMember) throw new ForbiddenException('You are not a member of this project');
    } catch (err) {
      if (err instanceof ForbiddenException) throw err;

      const status = (err as AxiosError).response?.status;
      if (status === 403 || status === 404) {
        throw new ForbiddenException('You are not a member of this project');
      }
      throw new ServiceUnavailableException('Could not verify project membership');
    }
  }
}
