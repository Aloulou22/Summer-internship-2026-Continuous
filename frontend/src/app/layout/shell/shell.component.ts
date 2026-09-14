import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { map } from 'rxjs';

import { MatSidenavContainer, MatSidenavModule } from '@angular/material/sidenav';
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
import { ProjectsService } from '../../core/services/projects.service';
import { NotificationsFeedService } from '../../core/services/notifications-feed.service';
import { NOTIFICATION_ICON } from '../../shared/constants/notification-meta';
import { formatRelativeTime } from '../../shared/utils/date.util';
import { AppNotification } from '../../core/models/notification.model';
import { Project } from '../../core/models/project.model';

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
    FormsModule,
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
  private readonly projectsService = inject(ProjectsService);
  private readonly injector = inject(Injector);
  private readonly sidenavContainer = viewChild.required(MatSidenavContainer);

  // The topbar search box used to be pure decoration (no handler wired up at
  // all) — this loads the user's projects once and filters them client-side,
  // which is enough for "jump to a project by name" without a real search
  // endpoint. Tasks aren't included: nothing today loads every task the user
  // can see in one place, so promising task search here would just recreate
  // the same "looks like it works but doesn't" problem.
  protected readonly searchQuery = signal('');
  // Results show only while focus is inside the search box, so clicking
  // anywhere else dismisses them.
  protected readonly searchOpen = signal(false);
  private readonly allProjects = signal<Project[]>([]);
  protected readonly searchResults = computed<Project[]>(() => {
    const q = this.searchQuery().trim().toLowerCase();
    if (!q) return [];
    return this.allProjects()
      .filter((p) => p.name.toLowerCase().includes(q))
      .slice(0, 6);
  });

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

    this.projectsService.listMine().subscribe((projects) => this.allProjects.set(projects));
  }

  goToSearchResult(project: Project): void {
    this.router.navigate(['/projects', project.id]);
    this.searchQuery.set('');
    this.searchOpen.set(false);
  }

  submitSearch(): void {
    const [first] = this.searchResults();
    if (first) this.goToSearchResult(first);
  }

  onSearchFocusOut(event: FocusEvent): void {
    const wrap = event.currentTarget as HTMLElement;
    if (!wrap.contains(event.relatedTarget as Node | null)) this.searchOpen.set(false);
  }

  toggleNav(drawer: { toggle: () => void }): void {
    if (this.isHandset()) {
      drawer.toggle();
      return;
    }
    this.collapsed.update((v) => !v);
    // Material re-measures the content's margin only when a drawer opens,
    // closes or changes mode — never when its width changes through a CSS
    // class. Without this, collapsing leaves a gap beside the nav, expanding
    // slides the nav over the page, and the saved state keeps it that way
    // across reloads. Measure once the class is applied (enough on its own
    // under reduced motion), then again when the width transition ends.
    afterNextRender(() => this.sidenavContainer().updateContentMargins(), {
      injector: this.injector,
    });
  }

  onNavTransitionEnd(event: TransitionEvent): void {
    // transitionend bubbles up from the nav items' own color transitions too.
    if (event.target === event.currentTarget && event.propertyName === 'width') {
      this.sidenavContainer().updateContentMargins();
    }
  }

  /** In the handset overlay, following a link should reveal the page it opened. */
  closeNavIfOverlay(drawer: { close: () => void }): void {
    if (this.isHandset()) drawer.close();
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
    // Go to the login page whether or not the server call succeeds: the local
    // session is cleared either way (AuthService.logout finalizes it), and
    // staying on a protected page with no session is a dead end.
    this.auth.logout().subscribe({
      complete: () => this.router.navigateByUrl('/login'),
      error: () => this.router.navigateByUrl('/login'),
    });
  }

  private readCollapsed(): boolean {
    return localStorage.getItem(COLLAPSED_KEY) === 'true';
  }
}
