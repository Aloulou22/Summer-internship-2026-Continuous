import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';

import { UserDirectoryService } from '../../../core/services/user-directory.service';
import { Profile } from '../../../core/models/profile.model';

@Component({
  selector: 'tf-assignee-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatButtonModule,
  ],
  templateUrl: './assignee-dialog.component.html',
  styleUrls: [
    '../../projects/project-form-dialog/project-form-dialog.component.scss',
    './assignee-dialog.component.scss',
  ],
})
export class AssigneeDialogComponent {
  private readonly directory = inject(UserDirectoryService);
  private readonly dialogRef = inject(MatDialogRef<AssigneeDialogComponent, string>);

  protected readonly search = new FormControl('', { nonNullable: true });
  private readonly searchTerm = toSignal(this.search.valueChanges, { initialValue: '' });

  protected readonly candidates = computed<Profile[]>(() => {
    const term = this.searchTerm().trim().toLowerCase();
    return this.directory
      .profiles()
      .filter((p) => !term || p.fullName.toLowerCase().includes(term))
      .slice(0, 20);
  });

  constructor() {
    this.directory.ensureLoaded().subscribe();
  }

  select(userId: string): void {
    this.dialogRef.close(userId);
  }
}
