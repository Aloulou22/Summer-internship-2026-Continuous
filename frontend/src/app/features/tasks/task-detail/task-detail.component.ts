import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatCheckboxModule } from '@angular/material/checkbox';

import { TasksService } from '../../../core/services/tasks.service';
import { UserDirectoryService } from '../../../core/services/user-directory.service';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService } from '../../../core/services/auth.service';
import { TaskDetail, TaskHistoryEntry, TaskStatus } from '../../../core/models/task.model';
import { TASK_PRIORITY_META, TASK_STATUS_META } from '../../../shared/constants/task-meta';
import { formatRelativeDeadline, formatRelativeTime } from '../../../shared/utils/date.util';

import { SkeletonComponent } from '../../../shared/ui/skeleton/skeleton.component';
import { AvatarComponent } from '../../../shared/ui/avatar/avatar.component';
import { StatusChipComponent } from '../../../shared/ui/status-chip/status-chip.component';
import { PriorityChipComponent } from '../../../shared/ui/priority-chip/priority-chip.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state/empty-state.component';
import { PlaceholderPageComponent } from '../../../shared/ui/placeholder-page/placeholder-page.component';
import { openConfirmDialog } from '../../../shared/ui/confirm-dialog/confirm-dialog.component';
import { TaskEditDialogComponent, TaskEditResult } from '../task-edit-dialog/task-edit-dialog.component';
import { AssigneeDialogComponent } from '../assignee-dialog/assignee-dialog.component';

const STATUS_ORDER: TaskStatus[] = ['todo', 'in_progress', 'in_review', 'done'];

@Component({
  selector: 'tf-task-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatCheckboxModule,
    SkeletonComponent,
    AvatarComponent,
    StatusChipComponent,
    PriorityChipComponent,
    EmptyStateComponent,
    PlaceholderPageComponent,
  ],
  templateUrl: './task-detail.component.html',
  styleUrl: './task-detail.component.scss',
})
export class TaskDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly tasksService = inject(TasksService);
  private readonly toast = inject(ToastService);
  private readonly dialog = inject(MatDialog);
  protected readonly directory = inject(UserDirectoryService);
  protected readonly auth = inject(AuthService);

  protected readonly statusOrder = STATUS_ORDER;
  protected readonly taskStatusMeta = TASK_STATUS_META;
  protected readonly relDeadline = formatRelativeDeadline;

  protected readonly projectId = this.route.snapshot.paramMap.get('projectId') ?? '';

  protected readonly loading = signal(true);
  protected readonly notFound = signal(false);
  protected readonly task = signal<TaskDetail | null>(null);

  protected readonly newSubtaskTitle = signal('');
  protected readonly newComment = signal('');

  protected readonly subtaskProgress = computed(() => {
    const subtasks = this.task()?.subtasks ?? [];
    return { done: subtasks.filter((s) => s.done).length, total: subtasks.length };
  });

  protected readonly sortedHistory = computed(() =>
    [...(this.task()?.history ?? [])].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    ),
  );

  constructor() {
    this.directory.ensureLoaded().subscribe();
    this.load();
  }

  changeStatus(status: TaskStatus): void {
    const task = this.task();
    if (!task || task.status === status) return;
    this.tasksService.updateStatus(task.id, status).subscribe((updated) => {
      this.task.update((t) => (t ? { ...t, ...updated } : t));
    });
  }

  editTask(): void {
    const task = this.task();
    if (!task) return;
    this.dialog
      .open<TaskEditDialogComponent, TaskDetail, TaskEditResult>(TaskEditDialogComponent, { data: task, width: '440px' })
      .afterClosed()
      .subscribe((result) => {
        if (!result) return;
        this.tasksService.update(task.id, result).subscribe((updated) => {
          this.task.set(updated);
          this.toast.success('Task updated');
        });
      });
  }

  changeAssignee(): void {
    const task = this.task();
    if (!task) return;
    this.dialog
      .open<AssigneeDialogComponent, void, string>(AssigneeDialogComponent, { width: '380px' })
      .afterClosed()
      .subscribe((userId) => {
        if (!userId) return;
        this.tasksService.assign(task.id, userId).subscribe((updated) => {
          this.task.set(updated);
          this.toast.success(`Assigned to ${this.directory.displayName(userId)}`);
        });
      });
  }

  deleteTask(): void {
    const task = this.task();
    if (!task) return;
    openConfirmDialog(this.dialog, {
      title: 'Delete task?',
      message: `"${task.title}" will be permanently deleted.`,
      confirmLabel: 'Delete',
      danger: true,
    })
      .afterClosed()
      .subscribe((confirmed) => {
        if (!confirmed) return;
        this.tasksService.remove(task.id).subscribe(() => {
          this.toast.success('Task deleted');
          this.router.navigate(['/projects', this.projectId]);
        });
      });
  }

  addSubtask(): void {
    const task = this.task();
    const title = this.newSubtaskTitle().trim();
    if (!task || !title) return;
    this.tasksService.addSubtask(task.id, title).subscribe((subtask) => {
      this.task.update((t) => (t ? { ...t, subtasks: [...t.subtasks, subtask] } : t));
      this.newSubtaskTitle.set('');
    });
  }

  toggleSubtask(subtaskId: string, done: boolean): void {
    const task = this.task();
    if (!task) return;
    this.tasksService.updateSubtask(task.id, subtaskId, { done }).subscribe((updated) => {
      this.task.update((t) =>
        t ? { ...t, subtasks: t.subtasks.map((s) => (s.id === subtaskId ? updated : s)) } : t,
      );
    });
  }

  removeSubtask(subtaskId: string): void {
    const task = this.task();
    if (!task) return;
    this.tasksService.removeSubtask(task.id, subtaskId).subscribe(() => {
      this.task.update((t) => (t ? { ...t, subtasks: t.subtasks.filter((s) => s.id !== subtaskId) } : t));
    });
  }

  addComment(): void {
    const task = this.task();
    const content = this.newComment().trim();
    if (!task || !content) return;
    this.tasksService.addComment(task.id, content).subscribe((comment) => {
      this.task.update((t) => (t ? { ...t, comments: [...t.comments, comment] } : t));
      this.newComment.set('');
    });
  }

  /** Turns a raw history row into a readable sentence. */
  historyText(entry: TaskHistoryEntry): string {
    const who = this.directory.displayName(entry.userId);
    if (entry.field === 'created') return `${who} created this task`;

    const format = (field: string, value?: string): string => {
      if (value == null || value === '') return '—';
      switch (field) {
        case 'status':
          return TASK_STATUS_META[value as TaskStatus]?.label ?? value;
        case 'priority':
          return TASK_PRIORITY_META[value as keyof typeof TASK_PRIORITY_META]?.label ?? value;
        case 'assigneeId':
          return this.directory.displayName(value);
        case 'deadline':
          return new Date(value).toLocaleDateString();
        default:
          return value.length > 40 ? `${value.slice(0, 40)}…` : value;
      }
    };

    const label: Record<string, string> = {
      title: 'the title',
      description: 'the description',
      priority: 'the priority',
      columnId: 'the column',
      assigneeId: 'the assignee',
      status: 'the status',
      deadline: 'the deadline',
    };

    return `${who} changed ${label[entry.field] ?? entry.field} from ${format(entry.field, entry.oldValue)} to ${format(entry.field, entry.newValue)}`;
  }

  historyTime(iso: string): string {
    return formatRelativeTime(iso);
  }

  commentTime(iso: string): string {
    return formatRelativeTime(iso);
  }

  private load(): void {
    const id = this.route.snapshot.paramMap.get('taskId');
    if (!id) {
      this.notFound.set(true);
      this.loading.set(false);
      return;
    }
    this.tasksService.getOne(id).subscribe({
      next: (task) => {
        this.task.set(task);
        this.loading.set(false);
      },
      error: () => {
        this.notFound.set(true);
        this.loading.set(false);
      },
    });
  }
}
