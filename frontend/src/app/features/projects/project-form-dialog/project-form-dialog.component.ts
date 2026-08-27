import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

import { AuthService } from '../../../core/services/auth.service';
import { CategoriesService } from '../../../core/services/categories.service';
import { Category, CreateProjectRequest, Project, ProjectStatus } from '../../../core/models/project.model';
import { PROJECT_STATUS_META } from '../../../shared/constants/project-meta';
import { toIsoDateOnly } from '../../../shared/utils/date.util';

export interface ProjectFormDialogData {
  mode: 'create' | 'edit';
  project?: Project;
}

// `name` is always set (the form requires it) — narrower than
// UpdateProjectRequest so it satisfies ProjectsService.create() directly;
// it's still assignable to update()'s Partial<CreateProjectRequest> shape.
export interface ProjectFormResult extends CreateProjectRequest {
  status?: ProjectStatus;
}

@Component({
  selector: 'tf-project-form-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
  ],
  templateUrl: './project-form-dialog.component.html',
  styleUrl: './project-form-dialog.component.scss',
})
export class ProjectFormDialogComponent {
  private readonly categoriesService = inject(CategoriesService);
  protected readonly auth = inject(AuthService);
  protected readonly data = inject<ProjectFormDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<ProjectFormDialogComponent, ProjectFormResult>);

  protected readonly statusOptions = Object.entries(PROJECT_STATUS_META).map(([value, meta]) => ({
    value: value as ProjectStatus,
    label: meta.label,
  }));

  protected readonly categories = signal<Category[]>([]);

  // Creating a category is admin/manager-only server-side (categories.controller.ts
  // in project-service) — categories otherwise have no seed data and no other
  // UI to create them, so without this the dropdown below would stay empty
  // forever for everyone.
  protected readonly canManageCategories = computed(() => {
    const role = this.auth.user()?.role;
    return role === 'admin' || role === 'manager';
  });
  protected readonly addingCategory = signal(false);
  protected readonly newCategoryName = signal('');
  protected readonly newCategoryColor = signal('#7c5cff');

  protected readonly form = new FormGroup({
    name: new FormControl(this.data.project?.name ?? '', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(2)],
    }),
    description: new FormControl(this.data.project?.description ?? '', { nonNullable: true }),
    categoryId: new FormControl<string | null>(this.data.project?.categoryId ?? null),
    deadline: new FormControl<Date | null>(
      this.data.project?.deadline ? new Date(this.data.project.deadline) : null,
    ),
    status: new FormControl<ProjectStatus>(this.data.project?.status ?? 'planning', { nonNullable: true }),
  });

  constructor() {
    this.categoriesService.listAll().subscribe((categories) => this.categories.set(categories));
  }

  createCategory(): void {
    const name = this.newCategoryName().trim();
    if (!name) return;
    this.categoriesService.create({ name, color: this.newCategoryColor() }).subscribe((category) => {
      this.categories.update((list) => [...list, category]);
      this.form.controls.categoryId.setValue(category.id);
      this.addingCategory.set(false);
      this.newCategoryName.set('');
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { name, description, categoryId, deadline, status } = this.form.getRawValue();
    const result: ProjectFormResult = {
      name,
      description: description || undefined,
      categoryId: categoryId ?? undefined,
      deadline: deadline ? toIsoDateOnly(deadline) : undefined,
      ...(this.data.mode === 'edit' ? { status } : {}),
    };
    this.dialogRef.close(result);
  }
}
