import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { TeamDetail } from '../models/team.model';

@Injectable({ providedIn: 'root' })
export class TeamsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/teams`;

  /** GET /teams — every team, each with its members eagerly loaded. */
  listAll(): Observable<TeamDetail[]> {
    return this.http.get<TeamDetail[]>(this.base);
  }
}
