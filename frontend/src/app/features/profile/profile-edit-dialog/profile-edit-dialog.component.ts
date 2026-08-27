import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

import { Profile, UpdateProfileRequest } from '../../../core/models/profile.model';

@Component({
  selector: 'tf-profile-edit-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  templateUrl: './profile-edit-dialog.component.html',
  styleUrl: '../../projects/project-form-dialog/project-form-dialog.component.scss',
})
export class ProfileEditDialogComponent {
  protected readonly profile = inject<Profile>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<ProfileEditDialogComponent, UpdateProfileRequest>);

  protected readonly form = new FormGroup({
    fullName: new FormControl(this.profile.fullName, {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(2)],
    }),
    jobTitle: new FormControl(this.profile.jobTitle ?? '', { nonNullable: true }),
    bio: new FormControl(this.profile.bio ?? '', { nonNullable: true }),
    avatarUrl: new FormControl(this.profile.avatarUrl ?? '', { nonNullable: true }),
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { fullName, jobTitle, bio, avatarUrl } = this.form.getRawValue();
    this.dialogRef.close({
      fullName,
      jobTitle: jobTitle || undefined,
      bio: bio || undefined,
      avatarUrl: avatarUrl || undefined,
    });
  }
}
