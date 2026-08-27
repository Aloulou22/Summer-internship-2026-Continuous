import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';

import { AuthService } from '../../core/services/auth.service';
import { ProfilesService } from '../../core/services/profiles.service';
import { ToastService } from '../../core/services/toast.service';
import { Profile, UpdateProfileRequest } from '../../core/models/profile.model';

import { SkeletonComponent } from '../../shared/ui/skeleton/skeleton.component';
import { AvatarComponent } from '../../shared/ui/avatar/avatar.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state/empty-state.component';
import { ProfileEditDialogComponent } from './profile-edit-dialog/profile-edit-dialog.component';

@Component({
  selector: 'tf-profile-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatIconModule, MatChipsModule, SkeletonComponent, AvatarComponent, EmptyStateComponent],
  templateUrl: './profile-page.component.html',
  styleUrl: './profile-page.component.scss',
})
export class ProfilePageComponent {
  private readonly profilesService = inject(ProfilesService);
  private readonly toast = inject(ToastService);
  private readonly dialog = inject(MatDialog);
  protected readonly auth = inject(AuthService);

  protected readonly loading = signal(true);
  // Not found (not an error state) covers the brief window right after
  // registration before the Kafka-driven auto-create has landed — the
  // profile genuinely doesn't exist yet, not a network failure.
  protected readonly notFound = signal(false);
  protected readonly profile = signal<Profile | null>(null);

  constructor() {
    this.load();
  }

  retry(): void {
    this.loading.set(true);
    this.notFound.set(false);
    this.load();
  }

  editProfile(): void {
    const profile = this.profile();
    if (!profile) return;
    this.dialog
      .open<ProfileEditDialogComponent, Profile, UpdateProfileRequest>(ProfileEditDialogComponent, {
        data: profile,
        width: '440px',
      })
      .afterClosed()
      .subscribe((result) => {
        if (!result) return;
        this.profilesService.update(profile.userId, result).subscribe((updated) => {
          this.profile.set(updated);
          this.toast.success('Profile updated');
        });
      });
  }

  private load(): void {
    this.profilesService.getMine().subscribe({
      next: (profile) => {
        this.profile.set(profile);
        this.loading.set(false);
      },
      error: () => {
        this.notFound.set(true);
        this.loading.set(false);
      },
    });
  }
}
