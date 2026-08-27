import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';

import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { PlatformUser, UserRole } from '../../../core/models/user.model';

import { SkeletonComponent } from '../../../shared/ui/skeleton/skeleton.component';
import { AvatarComponent } from '../../../shared/ui/avatar/avatar.component';

@Component({
  selector: 'tf-admin-users',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SkeletonComponent, AvatarComponent],
  templateUrl: './admin-users.component.html',
  styleUrl: './admin-users.component.scss',
})
export class AdminUsersComponent {
  protected readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  protected readonly loading = signal(true);
  protected readonly users = signal<PlatformUser[]>([]);
  // Tracks in-flight role changes so a slow response can't be raced by a
  // second click on the same row's dropdown.
  protected readonly savingId = signal<string | null>(null);

  constructor() {
    this.auth.listAllUsers().subscribe({
      next: (users) => {
        this.users.set(users);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  changeRole(user: PlatformUser, role: UserRole): void {
    if (role === user.role) return;
    this.savingId.set(user.id);
    this.auth.updateUserRole(user.id, role).subscribe({
      next: (updated) => {
        this.users.update((all) => all.map((u) => (u.id === updated.id ? updated : u)));
        this.savingId.set(null);
        this.toast.success(`${updated.fullName} is now ${updated.role}`);
      },
      error: (err) => {
        this.savingId.set(null);
        this.toast.error(err?.error?.message ?? "Couldn't change role");
      },
    });
  }
}
