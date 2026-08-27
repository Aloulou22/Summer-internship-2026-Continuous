import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, of, switchMap } from 'rxjs';

import { MatIconModule } from '@angular/material/icon';

import { AuthService } from '../../core/services/auth.service';
import { ProjectsService } from '../../core/services/projects.service';
import { TasksService } from '../../core/services/tasks.service';
import { Project } from '../../core/models/project.model';
import { Task } from '../../core/models/task.model';
import { PROJECT_STATUS_META } from '../../shared/constants/project-meta';
import { formatRelativeDeadline, formatRelativeTime, wasJustCreated } from '../../shared/utils/date.util';

import { SkeletonComponent } from '../../shared/ui/skeleton/skeleton.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state/empty-state.component';
import { StatusChipComponent } from '../../shared/ui/status-chip/status-chip.component';
import { PriorityChipComponent } from '../../shared/ui/priority-chip/priority-chip.component';

interface DeadlineItem {
  id: string;
  title: string;
  subtitle: string;
  deadline: string;
  kind: 'task' | 'project';
}

interface ActivityItem {
  id: string;
  title: string;
  projectName: string;
  verb: 'created' | 'updated';
  time: string;
}

@Component({
  selector: 'tf-dashboard-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    MatIconModule,
    SkeletonComponent,
    EmptyStateComponent,
    StatusChipComponent,
    PriorityChipComponent,
  ],
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.scss',
})
export class DashboardPageComponent {
  private readonly projectsService = inject(ProjectsService);
  private readonly tasksService = inject(TasksService);
  protected readonly auth = inject(AuthService);

  protected readonly projectStatusMeta = PROJECT_STATUS_META;
  protected readonly relDeadline = formatRelativeDeadline;

  protected readonly loading = signal(true);
  protected readonly projects = signal<Project[]>([]);
  protected readonly myTasks = signal<Task[]>([]);
  protected readonly allTasks = signal<Task[]>([]);

  protected readonly firstName = computed(() => this.auth.user()?.fullName.split(/\s+/)[0] ?? 'there');

  protected readonly projectsById = computed(() => new Map(this.projects().map((p) => [p.id, p])));

  protected readonly stats = computed(() => {
    const now = new Date();
    let overdueCount = 0;
    let dueSoonCount = 0;
    for (const task of this.myTasks()) {
      if (!task.deadline || task.status === 'done') continue;
      const rel = formatRelativeDeadline(task.deadline, now);
      if (rel.overdue) overdueCount++;
      else if (rel.dueSoon) dueSoonCount++;
    }
    return {
      projectCount: this.projects().length,
      assignedCount: this.myTasks().length,
      overdueCount,
      dueSoonCount,
    };
  });

  protected readonly myTasksPreview = computed(() =>
    [...this.myTasks()]
      .sort((a, b) => {
        if (a.deadline && b.deadline) return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
        return a.deadline ? -1 : b.deadline ? 1 : 0;
      })
      .slice(0, 6),
  );

  protected readonly upcomingDeadlines = computed<DeadlineItem[]>(() => {
    const byId = this.projectsById();
    const taskItems: DeadlineItem[] = this.myTasks()
      .filter((t): t is Task & { deadline: string } => !!t.deadline && t.status !== 'done')
      .map((t) => ({
        id: `task-${t.id}`,
        title: t.title,
        subtitle: byId.get(t.projectId)?.name ?? 'Project',
        deadline: t.deadline,
        kind: 'task',
      }));
    const projectItems: DeadlineItem[] = this.projects()
      .filter((p): p is Project & { deadline: string } => !!p.deadline && p.status !== 'completed' && p.status !== 'archived')
      .map((p) => ({
        id: `project-${p.id}`,
        title: p.name,
        subtitle: 'Project deadline',
        deadline: p.deadline,
        kind: 'project',
      }));
    return [...taskItems, ...projectItems]
      .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
      .slice(0, 6);
  });

  protected readonly projectsPreview = computed(() => this.projects().slice(0, 4));

  // No cross-project audit-log endpoint exists (only per-task history), so
  // "recent activity" is derived from task updatedAt timestamps rather than
  // true change events — an honest approximation, not a real activity feed.
  protected readonly recentActivity = computed<ActivityItem[]>(() => {
    const byId = this.projectsById();
    return [...this.allTasks()]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 6)
      .map((t) => ({
        id: t.id,
        title: t.title,
        projectName: byId.get(t.projectId)?.name ?? 'Project',
        verb: wasJustCreated(t.createdAt, t.updatedAt) ? 'created' : 'updated',
        time: formatRelativeTime(t.updatedAt),
      }));
  });

  constructor() {
    this.load();
  }

  private load(): void {
    this.projectsService
      .listMine()
      .pipe(
        switchMap((projects) => {
          this.projects.set(projects);
          if (!projects.length) return of<Task[][]>([]);
          return forkJoin(
            projects.map((p) => this.tasksService.listByProject(p.id).pipe(catchError(() => of<Task[]>([])))),
          );
        }),
        catchError(() => of<Task[][]>([])),
      )
      .subscribe((taskLists) => {
        const all = taskLists.flat();
        this.allTasks.set(all);
        const userId = this.auth.user()?.id;
        this.myTasks.set(all.filter((t) => t.assigneeId === userId));
        this.loading.set(false);
      });
  }
}
