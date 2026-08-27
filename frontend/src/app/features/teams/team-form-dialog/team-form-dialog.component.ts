import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

import { CreateTeamRequest, Team } from '../../../core/models/team.model';

export interface TeamFormDialogData {
  mode: 'create' | 'edit';
  team?: Team;
}

@Component({
  selector: 'tf-team-form-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  templateUrl: './team-form-dialog.component.html',
  styleUrl: './team-form-dialog.component.scss',
})
export class TeamFormDialogComponent {
  protected readonly data = inject<TeamFormDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<TeamFormDialogComponent, CreateTeamRequest>);

  protected readonly form = new FormGroup({
    name: new FormControl(this.data.team?.name ?? '', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(2)],
    }),
    description: new FormControl(this.data.team?.description ?? '', { nonNullable: true }),
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { name, description } = this.form.getRawValue();
    this.dialogRef.close({ name, description: description || undefined });
  }
}
