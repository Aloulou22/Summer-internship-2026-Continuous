import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';

import { UserDirectoryService } from '../../../core/services/user-directory.service';
import { Profile } from '../../../core/models/profile.model';
import { ProjectMemberRole } from '../../../core/models/project.model';

export interface AddMemberDialogData {
  /** userIds already on the project — excluded from the picker. */
  existingUserIds: string[];
}

export interface AddMemberResult {
  userId: string;
  role: ProjectMemberRole;
}

@Component({
  selector: 'tf-add-member-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatAutocompleteModule,
    MatButtonModule,
  ],
  templateUrl: './add-member-dialog.component.html',
  styleUrl: '../project-form-dialog/project-form-dialog.component.scss',
})
export class AddMemberDialogComponent {
  private readonly directory = inject(UserDirectoryService);
  protected readonly data = inject<AddMemberDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<AddMemberDialogComponent, AddMemberResult>);

  protected readonly userSearch = new FormControl('', { nonNullable: true });
  protected readonly role = new FormControl<ProjectMemberRole>('member', { nonNullable: true });
  private readonly selectedUserId = signal<string | null>(null);

  protected readonly form = new FormGroup({
    user: new FormControl<string | null>(null, { validators: [Validators.required] }),
  });

  private readonly searchTerm = toSignal(this.userSearch.valueChanges, { initialValue: '' });

  protected readonly candidates = computed<Profile[]>(() => {
    const excluded = new Set(this.data.existingUserIds);
    const term = this.searchTerm().trim().toLowerCase();
    return this.directory
      .profiles()
      .filter((p) => !excluded.has(p.userId))
      .filter((p) => !term || p.fullName.toLowerCase().includes(term))
      .slice(0, 20);
  });

  constructor() {
    this.directory.ensureLoaded().subscribe();
  }

  select(profile: Profile): void {
    this.selectedUserId.set(profile.userId);
    this.userSearch.setValue(profile.fullName, { emitEvent: false });
    this.form.controls.user.setValue(profile.userId);
  }

  submit(): void {
    const userId = this.selectedUserId();
    if (!userId) {
      this.form.markAllAsTouched();
      return;
    }
    this.dialogRef.close({ userId, role: this.role.value });
  }
}
