import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  AddMemberRequest,
  CreateProjectRequest,
  Project,
  ProjectDetail,
  ProjectMember,
  ProjectMemberRole,
  UpdateProjectRequest,
} from '../models/project.model';

@Injectable({ providedIn: 'root' })
export class ProjectsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/projects`;

  /** GET /projects — the current user's projects (membership-scoped server-side). */
  listMine(): Observable<Project[]> {
    return this.http.get<Project[]>(this.base);
  }

  /** GET /projects/:id — caller must be a member; includes members + Kanban columns. */
  getOne(id: string): Observable<ProjectDetail> {
    return this.http.get<ProjectDetail>(`${this.base}/${id}`);
  }

  /** POST /projects — creator becomes the owner member. */
  create(dto: CreateProjectRequest): Observable<ProjectDetail> {
    return this.http.post<ProjectDetail>(this.base, dto);
  }

  /** PATCH /projects/:id — owner/admin only. */
  update(id: string, dto: UpdateProjectRequest): Observable<ProjectDetail> {
    return this.http.patch<ProjectDetail>(`${this.base}/${id}`, dto);
  }

  /** DELETE /projects/:id — owner/admin only. */
  remove(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/${id}`);
  }

  /** POST /projects/:id/members — owner/admin only. */
  addMember(id: string, dto: AddMemberRequest): Observable<ProjectMember> {
    return this.http.post<ProjectMember>(`${this.base}/${id}/members`, dto);
  }

  /** PATCH /projects/:id/members/:userId — owner/admin only. */
  updateMemberRole(id: string, userId: string, role: ProjectMemberRole): Observable<ProjectMember> {
    return this.http.patch<ProjectMember>(`${this.base}/${id}/members/${userId}`, { role });
  }

  /** DELETE /projects/:id/members/:userId — owner/admin only. */
  removeMember(id: string, userId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/${id}/members/${userId}`);
  }
}
