import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { Observable, finalize, of, shareReplay, tap } from 'rxjs';

import { AuthService } from './auth.service';
import { ProfilesService } from './profiles.service';
import { Profile } from '../models/profile.model';

// A lookup miss usually means the cached list predates that user's profile —
// profiles are created asynchronously from a Kafka event after sign-up — so a
// miss triggers a refetch. Throttled, so an id that genuinely has no profile
// can't cause a request storm.
const MISS_REFETCH_INTERVAL_MS = 15_000;

/**
 * Project members / task assignees / comment authors are all bare userIds
 * (Database per Service — no joins across services). This resolves those
 * ids to display names/avatars app-wide, loading the full profile list once
 * and caching it rather than refetching per component.
 */
@Injectable({ providedIn: 'root' })
export class UserDirectoryService {
  private readonly profilesService = inject(ProfilesService);
  private readonly auth = inject(AuthService);

  private readonly _profiles = signal<Profile[]>([]);
  private readonly _loaded = signal(false);
  private loadInFlight$: Observable<Profile[]> | null = null;
  // Bumped whenever the cache is cleared, so a response that was already in
  // flight for the previous session is discarded instead of repopulating it.
  private generation = 0;
  private lastMissRefetch = 0;

  readonly profiles = this._profiles.asReadonly();
  readonly byUserId = computed(() => new Map(this._profiles().map((p) => [p.userId, p])));

  constructor() {
    // This service is app-wide and outlives a session: without this, logging
    // out and signing in as someone else — or registering a new account in
    // the same tab — kept showing the previous session's list.
    let previousUserId: string | null | undefined;
    effect(() => {
      const userId = this.auth.user()?.id ?? null;
      if (previousUserId !== undefined && userId !== previousUserId) {
        untracked(() => this.clear());
      }
      previousUserId = userId;
    });
  }

  /** Fetches the profile directory if it hasn't been loaded yet; safe to call repeatedly. */
  ensureLoaded(): Observable<Profile[]> {
    if (this._loaded()) return of(this._profiles());
    if (!this.loadInFlight$) {
      const generation = this.generation;
      this.loadInFlight$ = this.profilesService.listAll().pipe(
        tap((profiles) => {
          if (generation !== this.generation) return;
          this._profiles.set(profiles);
          this._loaded.set(true);
        }),
        shareReplay(1),
        finalize(() => {
          if (generation === this.generation) this.loadInFlight$ = null;
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
    const profile = this.byUserId().get(userId);
    if (profile) return profile.fullName;

    // The signed-in user's own name is always known from the session, even
    // before their profile has reached the directory.
    const me = this.auth.user();
    if (me && me.id === userId) return me.fullName;

    this.refetchAfterMiss();
    return 'Unknown user';
  }

  initials(userId: string): string {
    return this.displayName(userId)
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('');
  }

  private refetchAfterMiss(): void {
    // Not loaded yet, or a load already coming: that request will cover it.
    if (!this._loaded() || this.loadInFlight$) return;
    const now = Date.now();
    if (now - this.lastMissRefetch < MISS_REFETCH_INTERVAL_MS) return;
    this.lastMissRefetch = now;
    // Deferred because this runs while a template renders, where writing
    // signals isn't allowed.
    queueMicrotask(() => this.reload().subscribe());
  }

  private clear(): void {
    this.generation++;
    this.loadInFlight$ = null;
    this._profiles.set([]);
    this._loaded.set(false);
  }
}
