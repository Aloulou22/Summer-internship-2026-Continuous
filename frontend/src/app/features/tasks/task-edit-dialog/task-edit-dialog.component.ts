import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatButtonModule } from '@angular/material/button';

import { Task, TaskPriority, UpdateTaskRequest } from '../../../core/models/task.model';
import { TASK_PRIORITY_META } from '../../../shared/constants/task-meta';
import { toIsoDateOnly } from '../../../shared/utils/date.util';

export type TaskEditResult = Pick<UpdateTaskRequest, 'title' | 'description' | 'priority' | 'deadline'>;

@Component({
  selector: 'tf-task-edit-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatButtonModule,
  ],
  templateUrl: './task-edit-dialog.component.html',
  styleUrl: '../../projects/project-form-dialog/project-form-dialog.component.scss',
})
export class TaskEditDialogComponent {
  protected readonly task = inject<Task>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<TaskEditDialogComponent, TaskEditResult>);

  protected readonly priorityOptions = Object.entries(TASK_PRIORITY_META).map(([value, meta]) => ({
    value: value as TaskPriority,
    label: meta.label,
  }));

  protected readonly form = new FormGroup({
    title: new FormControl(this.task.title, {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(2)],
    }),
    description: new FormControl(this.task.description ?? '', { nonNullable: true }),
    priority: new FormControl<TaskPriority>(this.task.priority, { nonNullable: true }),
    deadline: new FormControl<Date | null>(this.task.deadline ? new Date(this.task.deadline) : null),
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { title, description, priority, deadline } = this.form.getRawValue();
    this.dialogRef.close({
      title,
      description: description || undefined,
      priority,
      deadline: deadline ? toIsoDateOnly(deadline) : undefined,
    });
  }
}
