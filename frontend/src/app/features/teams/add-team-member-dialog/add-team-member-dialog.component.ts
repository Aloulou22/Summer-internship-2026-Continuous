import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';

import { UserDirectoryService } from '../../../core/services/user-directory.service';
import { Profile } from '../../../core/models/profile.model';

export interface AddTeamMemberDialogData {
  teamName: string;
  /** userIds already on this team — excluded from the picker. */
  existingUserIds: string[];
}

/** Closes with the picked user's userId, or undefined when cancelled. */
@Component({
  selector: 'tf-add-team-member-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatButtonModule,
  ],
  templateUrl: './add-team-member-dialog.component.html',
  styleUrls: [
    '../team-form-dialog/team-form-dialog.component.scss',
    './add-team-member-dialog.component.scss',
  ],
})
export class AddTeamMemberDialogComponent {
  private readonly directory = inject(UserDirectoryService);
  protected readonly data = inject<AddTeamMemberDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<AddTeamMemberDialogComponent, string>);

  // Holds the typed search text, or the picked Profile once the autocomplete
  // writes the selected option's value back into the control.
  protected readonly userSearch = new FormControl<string | Profile>('', { nonNullable: true });
  protected readonly selected = signal<Profile | null>(null);

  private readonly searchValue = toSignal(this.userSearch.valueChanges, { initialValue: '' });

  protected readonly candidates = computed<Profile[]>(() => {
    const excluded = new Set(this.data.existingUserIds);
    const raw = this.searchValue();
    const term = (typeof raw === 'string' ? raw : '').trim().toLowerCase();
    return this.directory
      .profiles()
      .filter((p) => !excluded.has(p.userId))
      .filter((p) => !term || p.fullName.toLowerCase().includes(term))
      .slice(0, 20);
  });

  protected readonly displayName = (value: string | Profile | null): string =>
    typeof value === 'string' ? value : (value?.fullName ?? '');

  constructor() {
    // Always refetch: the cached directory can predate new sign-ups, and the
    // "on <team>" hint must reflect current membership.
    this.directory.reload().subscribe();
  }

  submit(): void {
    const profile = this.selected();
    if (profile) this.dialogRef.close(profile.userId);
  }
}
