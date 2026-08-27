import { Injectable, computed, inject, signal } from '@angular/core';
import { Subscription, catchError, interval, of, startWith, switchMap } from 'rxjs';

import { NotificationsService } from './notifications.service';
import { AppNotification } from '../models/notification.model';

const POLL_INTERVAL_MS = 20_000;

/**
 * Facade the bell/panel UI talks to. Today it polls GET /notifications on
 * an interval (the backend has no push channel yet — see subject brief).
 * When that changes to Kafka-over-WebSocket/SSE, only `start()`'s internals
 * need to change to subscribe to that stream instead of `interval()` — the
 * signals, mutation methods, and every component consuming them stay the
 * same.
 */
@Injectable({ providedIn: 'root' })
export class NotificationsFeedService {
  private readonly api = inject(NotificationsService);

  private readonly _notifications = signal<AppNotification[]>([]);
  readonly notifications = this._notifications.asReadonly();
  readonly unreadCount = computed(() => this._notifications().filter((n) => !n.read).length);

  private subscription: Subscription | null = null;

  /** Call when the authenticated shell mounts; safe to call more than once. */
  start(): void {
    if (this.subscription) return;
    this.subscription = interval(POLL_INTERVAL_MS)
      .pipe(
        startWith(0),
        switchMap(() => this.api.listAll().pipe(catchError(() => of<AppNotification[]>([])))),
      )
      .subscribe((list) => this._notifications.set(list));
  }

  /** Call on logout / when the shell unmounts, so polling doesn't outlive the session. */
  stop(): void {
    this.subscription?.unsubscribe();
    this.subscription = null;
    this._notifications.set([]);
  }

  markRead(id: string): void {
    const target = this._notifications().find((n) => n.id === id);
    if (!target || target.read) return;
    this._notifications.update((list) => list.map((n) => (n.id === id ? { ...n, read: true } : n)));
    this.api.markRead(id).subscribe();
  }

  markAllRead(): void {
    if (this.unreadCount() === 0) return;
    this._notifications.update((list) => list.map((n) => ({ ...n, read: true })));
    this.api.markAllRead().subscribe();
  }

  remove(id: string): void {
    this._notifications.update((list) => list.filter((n) => n.id !== id));
    this.api.remove(id).subscribe();
  }
}
