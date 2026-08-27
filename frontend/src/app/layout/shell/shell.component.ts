import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { map } from 'rxjs';

import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';

import { LogoComponent } from '../../shared/ui/logo/logo.component';
import { AvatarComponent } from '../../shared/ui/avatar/avatar.component';
import { ThemeService, ThemePreference } from '../../core/services/theme.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationsFeedService } from '../../core/services/notifications-feed.service';
import { NOTIFICATION_ICON } from '../../shared/constants/notification-meta';
import { formatRelativeTime } from '../../shared/utils/date.util';
import { AppNotification } from '../../core/models/notification.model';

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

const COLLAPSED_KEY = 'tf-sidenav-collapsed';

const BASE_NAV_ITEMS: NavItem[] = [
  { path: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { path: '/projects', label: 'Projects', icon: 'folder_open' },
  { path: '/teams', label: 'Teams', icon: 'groups' },
];

@Component({
  selector: 'tf-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    MatSidenavModule,
    MatToolbarModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatFormFieldModule,
    MatInputModule,
    MatBadgeModule,
    MatTooltipModule,
    MatDividerModule,
    LogoComponent,
    AvatarComponent,
  ],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
})
export class ShellComponent {
  protected readonly theme = inject(ThemeService);
  protected readonly auth = inject(AuthService);

  // Admin-only "Users" link — role management (auth.guard.ts) is enforced
  // server-side regardless, this just keeps the nav from advertising a page
  // a non-admin can't use.
  protected readonly navItems = computed<NavItem[]>(() =>
    this.auth.user()?.role === 'admin'
      ? [...BASE_NAV_ITEMS, { path: '/admin/users', label: 'Users', icon: 'admin_panel_settings' }]
      : BASE_NAV_ITEMS,
  );
  protected readonly notificationsFeed = inject(NotificationsFeedService);
  protected readonly notificationIcon = NOTIFICATION_ICON;
  protected readonly notificationTime = formatRelativeTime;
  private readonly breakpointObserver = inject(BreakpointObserver);
  private readonly router = inject(Router);

  protected readonly isHandset = toSignal(
    this.breakpointObserver.observe(Breakpoints.Handset).pipe(map((r) => r.matches)),
    { initialValue: false },
  );

  protected readonly collapsed = signal(this.readCollapsed());
  protected readonly sidenavMode = computed(() => (this.isHandset() ? 'over' : 'side'));

  constructor() {
    effect(() => {
      localStorage.setItem(COLLAPSED_KEY, String(this.collapsed()));
    });

    this.notificationsFeed.start();
    inject(DestroyRef).onDestroy(() => this.notificationsFeed.stop());
  }

  toggleNav(drawer: { toggle: () => void }): void {
    if (this.isHandset()) {
      drawer.toggle();
    } else {
      this.collapsed.update((v) => !v);
    }
  }

  setTheme(preference: ThemePreference): void {
    this.theme.setPreference(preference);
  }

  openNotification(notification: AppNotification): void {
    this.notificationsFeed.markRead(notification.id);
    const { taskId, projectId } = notification.metadata ?? {};
    if (taskId && projectId) {
      this.router.navigate(['/projects', projectId, 'tasks', taskId]);
    }
  }

  logout(): void {
    this.auth.logout().subscribe(() => this.router.navigateByUrl('/login'));
  }

  private readCollapsed(): boolean {
    return localStorage.getItem(COLLAPSED_KEY) === 'true';
  }
}
