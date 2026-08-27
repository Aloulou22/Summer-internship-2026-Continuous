import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { ProjectsService } from '../../../core/services/projects.service';
import { Project } from '../../../core/models/project.model';
import { PROJECT_STATUS_META } from '../../../shared/constants/project-meta';
import { formatRelativeDeadline } from '../../../shared/utils/date.util';
import { ToastService } from '../../../core/services/toast.service';

import { SkeletonComponent } from '../../../shared/ui/skeleton/skeleton.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state/empty-state.component';
import {
  ProjectFormDialogComponent,
  ProjectFormDialogData,
  ProjectFormResult,
} from '../project-form-dialog/project-form-dialog.component';

@Component({
  selector: 'tf-projects-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatIconModule, SkeletonComponent, EmptyStateComponent],
  templateUrl: './projects-list.component.html',
  styleUrl: './projects-list.component.scss',
})
export class ProjectsListComponent {
  private readonly projectsService = inject(ProjectsService);
  private readonly toast = inject(ToastService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);

  protected readonly projectStatusMeta = PROJECT_STATUS_META;
  protected readonly relDeadline = formatRelativeDeadline;

  protected readonly loading = signal(true);
  protected readonly projects = signal<Project[]>([]);

  constructor() {
    this.load();
  }

  openProject(project: Project): void {
    this.router.navigate(['/projects', project.id]);
  }

  createProject(): void {
    const ref = this.dialog.open<ProjectFormDialogComponent, ProjectFormDialogData, ProjectFormResult>(
      ProjectFormDialogComponent,
      { data: { mode: 'create' }, width: '440px' },
    );
    ref.afterClosed().subscribe((result) => {
      if (!result) return;
      this.projectsService.create(result).subscribe((project) => {
        this.projects.update((list) => [project, ...list]);
        this.toast.success(`"${project.name}" created`);
      });
    });
  }

  private load(): void {
    this.projectsService.listMine().subscribe({
      next: (projects) => {
        this.projects.set(projects);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
