import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { CreateTeamRequest, Team, TeamDetail, UpdateTeamRequest } from '../models/team.model';

@Injectable({ providedIn: 'root' })
export class TeamsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/teams`;

  /** GET /teams — every team, each with its members eagerly loaded. */
  listAll(): Observable<TeamDetail[]> {
    return this.http.get<TeamDetail[]>(this.base);
  }

  /** POST /teams — admin only. */
  create(dto: CreateTeamRequest): Observable<Team> {
    return this.http.post<Team>(this.base, dto);
  }

  /** PATCH /teams/:id — admin only. */
  update(id: string, dto: UpdateTeamRequest): Observable<Team> {
    return this.http.patch<Team>(`${this.base}/${id}`, dto);
  }

  /** DELETE /teams/:id — admin only. */
  remove(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/${id}`);
  }

  /**
   * POST /teams/:id/members — admin only. A user belongs to at most one team,
   * so this moves them off any team they were already on.
   */
  addMember(teamId: string, userId: string): Observable<TeamDetail> {
    return this.http.post<TeamDetail>(`${this.base}/${teamId}/members`, { userId });
  }

  /** DELETE /teams/:id/members/:userId — admin only. */
  removeMember(teamId: string, userId: string): Observable<TeamDetail> {
    return this.http.delete<TeamDetail>(`${this.base}/${teamId}/members/${userId}`);
  }
}
