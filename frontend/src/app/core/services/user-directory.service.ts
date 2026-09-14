import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, finalize, of, shareReplay, tap } from 'rxjs';

import { ProfilesService } from './profiles.service';
import { Profile } from '../models/profile.model';

/**
 * Project members / task assignees / comment authors are all bare userIds
 * (Database per Service — no joins across services). This resolves those
 * ids to display names/avatars app-wide, loading the full profile list once
 * and caching it rather than refetching per component.
 */
@Injectable({ providedIn: 'root' })
export class UserDirectoryService {
  private readonly profilesService = inject(ProfilesService);

  private readonly _profiles = signal<Profile[]>([]);
  private readonly _loaded = signal(false);
  private loadInFlight$: Observable<Profile[]> | null = null;

  readonly profiles = this._profiles.asReadonly();
  readonly byUserId = computed(() => new Map(this._profiles().map((p) => [p.userId, p])));

  /** Fetches the profile directory if it hasn't been loaded yet; safe to call repeatedly. */
  ensureLoaded(): Observable<Profile[]> {
    if (this._loaded()) return of(this._profiles());
    if (!this.loadInFlight$) {
      this.loadInFlight$ = this.profilesService.listAll().pipe(
        tap((profiles) => {
          this._profiles.set(profiles);
          this._loaded.set(true);
        }),
        shareReplay(1),
        finalize(() => {
          this.loadInFlight$ = null;
        }),
      );
    }
    return this.loadInFlight$;
  }

  /**
   * Re-fetches the directory. For pickers where a stale list matters: users
   * who registered after the first load, or someone moved to another team.
   */
  reload(): Observable<Profile[]> {
    this._loaded.set(false);
    return this.ensureLoaded();
  }

  displayName(userId: string): string {
    return this.byUserId().get(userId)?.fullName ?? 'Unknown user';
  }

  initials(userId: string): string {
    return this.displayName(userId)
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('');
  }
}
