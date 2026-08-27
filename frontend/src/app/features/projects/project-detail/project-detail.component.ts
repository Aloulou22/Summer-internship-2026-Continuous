import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';

import { AuthService } from '../../../core/services/auth.service';
import { ProjectsService } from '../../../core/services/projects.service';
import { UserDirectoryService } from '../../../core/services/user-directory.service';
import { ToastService } from '../../../core/services/toast.service';
import { ProjectDetail, ProjectMemberRole } from '../../../core/models/project.model';
import { PROJECT_STATUS_META } from '../../../shared/constants/project-meta';
import { formatRelativeDeadline } from '../../../shared/utils/date.util';

import { SkeletonComponent } from '../../../shared/ui/skeleton/skeleton.component';
import { AvatarComponent } from '../../../shared/ui/avatar/avatar.component';
import { PlaceholderPageComponent } from '../../../shared/ui/placeholder-page/placeholder-page.component';
import { openConfirmDialog } from '../../../shared/ui/confirm-dialog/confirm-dialog.component';
import {
  ProjectFormDialogComponent,
  ProjectFormDialogData,
  ProjectFormResult,
} from '../project-form-dialog/project-form-dialog.component';
import {
  AddMemberDialogComponent,
  AddMemberDialogData,
  AddMemberResult,
} from '../add-member-dialog/add-member-dialog.component';
import { KanbanBoardComponent } from '../kanban-board/kanban-board.component';

const MANAGER_ROLES: ProjectMemberRole[] = ['owner', 'admin'];

@Component({
  selector: 'tf-project-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatMenuModule,
    MatTooltipModule,
    SkeletonComponent,
    AvatarComponent,
    PlaceholderPageComponent,
    KanbanBoardComponent,
  ],
  templateUrl: './project-detail.component.html',
  styleUrl: './project-detail.component.scss',
})
export class ProjectDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly projectsService = inject(ProjectsService);
  private readonly toast = inject(ToastService);
  private readonly dialog = inject(MatDialog);
  protected readonly auth = inject(AuthService);
  protected readonly directory = inject(UserDirectoryService);

  protected readonly projectStatusMeta = PROJECT_STATUS_META;
  protected readonly relDeadline = formatRelativeDeadline;

  protected readonly loading = signal(true);
  protected readonly notFound = signal(false);
  protected readonly project = signal<ProjectDetail | null>(null);

  protected readonly myRole = computed<ProjectMemberRole | null>(() => {
    const userId = this.auth.user()?.id;
    return this.project()?.members.find((m) => m.userId === userId)?.role ?? null;
  });
  protected readonly canManage = computed(() => {
    const role = this.myRole();
    return !!role && MANAGER_ROLES.includes(role);
  });

  constructor() {
    this.directory.ensureLoaded().subscribe();
    this.load();
  }

  editProject(): void {
    const project = this.project();
    if (!project) return;
    const ref = this.dialog.open<ProjectFormDialogComponent, ProjectFormDialogData, ProjectFormResult>(
      ProjectFormDialogComponent,
      { data: { mode: 'edit', project }, width: '440px' },
    );
    ref.afterClosed().subscribe((result) => {
      if (!result) return;
      this.projectsService.update(project.id, result).subscribe((updated) => {
        this.project.set(updated);
        this.toast.success('Project updated');
      });
    });
  }

  deleteProject(): void {
    const project = this.project();
    if (!project) return;
    openConfirmDialog(this.dialog, {
      title: 'Delete project?',
      message: `"${project.name}" and all its tasks will be permanently deleted. This can't be undone.`,
      confirmLabel: 'Delete',
      danger: true,
    })
      .afterClosed()
      .subscribe((confirmed) => {
        if (!confirmed) return;
        this.projectsService.remove(project.id).subscribe(() => {
          this.toast.success('Project deleted');
          this.router.navigateByUrl('/projects');
        });
      });
  }

  addMember(): void {
    const project = this.project();
    if (!project) return;
    const ref = this.dialog.open<AddMemberDialogComponent, AddMemberDialogData, AddMemberResult>(
      AddMemberDialogComponent,
      { data: { existingUserIds: project.members.map((m) => m.userId) }, width: '420px' },
    );
    ref.afterClosed().subscribe((result) => {
      if (!result) return;
      this.projectsService.addMember(project.id, result).subscribe((member) => {
        this.project.update((p) => (p ? { ...p, members: [...p.members, member] } : p));
        this.toast.success(`${this.directory.displayName(result.userId)} added to the project`);
      });
    });
  }

  changeMemberRole(userId: string, role: ProjectMemberRole): void {
    const project = this.project();
    if (!project) return;
    this.projectsService.updateMemberRole(project.id, userId, role).subscribe((updated) => {
      this.project.update((p) =>
        p ? { ...p, members: p.members.map((m) => (m.userId === userId ? updated : m)) } : p,
      );
    });
  }

  removeMember(userId: string): void {
    const project = this.project();
    if (!project) return;
    openConfirmDialog(this.dialog, {
      title: 'Remove member?',
      message: `${this.directory.displayName(userId)} will lose access to this project.`,
      confirmLabel: 'Remove',
      danger: true,
    })
      .afterClosed()
      .subscribe((confirmed) => {
        if (!confirmed) return;
        this.projectsService.removeMember(project.id, userId).subscribe(() => {
          this.project.update((p) =>
            p ? { ...p, members: p.members.filter((m) => m.userId !== userId) } : p,
          );
        });
      });
  }

  private load(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.notFound.set(true);
      this.loading.set(false);
      return;
    }
    this.projectsService.getOne(id).subscribe({
      next: (project) => {
        this.project.set(project);
        this.loading.set(false);
      },
      error: () => {
        this.notFound.set(true);
        this.loading.set(false);
      },
    });
  }
}
