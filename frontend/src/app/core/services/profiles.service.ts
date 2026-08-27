import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Profile, UpdateProfileRequest } from '../models/profile.model';

@Injectable({ providedIn: 'root' })
export class ProfilesService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/profiles`;

  /** GET /profiles — every registered user's profile (used to build member pickers / resolve names). */
  listAll(): Observable<Profile[]> {
    return this.http.get<Profile[]>(this.base);
  }

  /** GET /profiles/me — the current user's own profile. */
  getMine(): Observable<Profile> {
    return this.http.get<Profile>(`${this.base}/me`);
  }

  /** GET /profiles/:userId */
  getByUserId(userId: string): Observable<Profile> {
    return this.http.get<Profile>(`${this.base}/${userId}`);
  }

  /** PATCH /profiles/:userId — self or admin only (enforced server-side). */
  update(userId: string, dto: UpdateProfileRequest): Observable<Profile> {
    return this.http.patch<Profile>(`${this.base}/${userId}`, dto);
  }
}
