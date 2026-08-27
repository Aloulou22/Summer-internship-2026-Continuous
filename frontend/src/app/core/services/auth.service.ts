import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, finalize, map, of, shareReplay, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AuthResponse, LoginRequest, RegisterRequest } from '../models/auth.model';
import { PlatformUser, User, UserRole } from '../models/user.model';

/**
 * Owns the session: the access token (kept in memory only — never
 * localStorage, since it never needs to survive a reload on its own) and
 * the current user.
 *
 * The refresh token is an httpOnly cookie set by auth-service through the
 * gateway (path-scoped to /auth) — this service never sees its value, it
 * just calls /auth/refresh with credentials and lets the browser attach the
 * cookie. That's also how a session survives a hard reload: `tryRestoreSession`
 * runs once at app bootstrap (see app.config.ts) and silently calls
 * /auth/refresh; if the cookie is still valid, the user is signed back in
 * before the router does its first navigation.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/auth`;

  private readonly _accessToken = signal<string | null>(null);
  private readonly _user = signal<User | null>(null);
  // True only for the session that just called register() — lets the
  // dashboard say "Welcome" instead of "Welcome back" for a brand-new
  // account. Resets on logout/clearSession and doesn't survive a reload
  // (tryRestoreSession never sets it), which is correct: by the next visit
  // they really are a returning user.
  private readonly _justRegistered = signal(false);

  readonly user = this._user.asReadonly();
  readonly isAuthenticated = computed(() => this._user() !== null);
  readonly justRegistered = this._justRegistered.asReadonly();

  /** Read synchronously by the auth interceptor on every outgoing request. */
  get accessToken(): string | null {
    return this._accessToken();
  }

  private refreshInFlight$: Observable<AuthResponse> | null = null;

  register(dto: RegisterRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.base}/register`, dto, { withCredentials: true })
      .pipe(
        tap((res) => {
          this.setSession(res);
          this._justRegistered.set(true);
        }),
      );
  }

  login(dto: LoginRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.base}/login`, dto, { withCredentials: true })
      .pipe(tap((res) => this.setSession(res)));
  }

  logout(): Observable<unknown> {
    return this.http
      .post(`${this.base}/logout`, {}, { withCredentials: true })
      .pipe(finalize(() => this.clearSession()));
  }

  /**
   * Exchanges the refresh cookie for a fresh token pair. Concurrent callers
   * (e.g. several requests 401-ing at once) share one in-flight call instead
   * of each triggering their own refresh — the shared observable is cleared
   * as soon as it settles so the next expiry starts a new one.
   */
  refreshSession(): Observable<AuthResponse> {
    if (!this.refreshInFlight$) {
      this.refreshInFlight$ = this.http
        .post<AuthResponse>(`${this.base}/refresh`, {}, { withCredentials: true })
        .pipe(
          tap((res) => this.setSession(res)),
          finalize(() => {
            this.refreshInFlight$ = null;
          }),
          shareReplay(1),
        );
    }
    return this.refreshInFlight$;
  }

  /** Called once at app bootstrap (provideAppInitializer). Never throws. */
  tryRestoreSession(): Observable<boolean> {
    return this.refreshSession().pipe(
      map(() => true),
      catchError(() => {
        this.clearSession();
        return of(false);
      }),
    );
  }

  /** GET /auth/users — admin only. Powers the Admin > Users screen. */
  listAllUsers(): Observable<PlatformUser[]> {
    return this.http.get<PlatformUser[]>(`${this.base}/users`);
  }

  /** PATCH /auth/users/:id/role — admin only. */
  updateUserRole(id: string, role: UserRole): Observable<PlatformUser> {
    return this.http.patch<PlatformUser>(`${this.base}/users/${id}/role`, { role });
  }

  private setSession(res: AuthResponse): void {
    this._accessToken.set(res.accessToken);
    this._user.set(res.user);
  }

  clearSession(): void {
    this._accessToken.set(null);
    this._user.set(null);
    this._justRegistered.set(false);
  }
}
