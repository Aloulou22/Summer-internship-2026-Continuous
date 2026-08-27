import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';

import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog } from '@angular/material/dialog';

import { TasksService } from '../../../core/services/tasks.service';
import { UserDirectoryService } from '../../../core/services/user-directory.service';
import { ToastService } from '../../../core/services/toast.service';
import { Task, TaskStatus } from '../../../core/models/task.model';
import { TASK_STATUS_META } from '../../../shared/constants/task-meta';
import { formatRelativeDeadline } from '../../../shared/utils/date.util';

import { SkeletonComponent } from '../../../shared/ui/skeleton/skeleton.component';
import { AvatarComponent } from '../../../shared/ui/avatar/avatar.component';
import { PriorityChipComponent } from '../../../shared/ui/priority-chip/priority-chip.component';
import { openConfirmDialog } from '../../../shared/ui/confirm-dialog/confirm-dialog.component';

const STATUS_ORDER: TaskStatus[] = ['todo', 'in_progress', 'in_review', 'done'];

interface ColumnDef {
  status: TaskStatus;
  listId: string;
  label: string;
  icon: string;
  colorVar: string;
}

@Component({
  selector: 'tf-kanban-board',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    DragDropModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    SkeletonComponent,
    AvatarComponent,
    PriorityChipComponent,
  ],
  templateUrl: './kanban-board.component.html',
  styleUrl: './kanban-board.component.scss',
})
export class KanbanBoardComponent implements OnInit {
  readonly projectId = input.required<string>();

  private readonly tasksService = inject(TasksService);
  private readonly toast = inject(ToastService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  protected readonly directory = inject(UserDirectoryService);

  protected readonly relDeadline = formatRelativeDeadline;

  protected readonly columns: ColumnDef[] = STATUS_ORDER.map((status) => ({
    status,
    listId: `tf-kanban-col-${status}`,
    label: TASK_STATUS_META[status].label,
    icon: TASK_STATUS_META[status].icon,
    colorVar: TASK_STATUS_META[status].colorVar,
  }));
  protected readonly allListIds = this.columns.map((c) => c.listId);

  protected readonly loading = signal(true);
  protected readonly tasks = signal<Task[]>([]);

  protected readonly tasksByStatus = computed<Record<TaskStatus, Task[]>>(() => {
    const groups: Record<TaskStatus, Task[]> = { todo: [], in_progress: [], in_review: [], done: [] };
    for (const task of this.tasks()) groups[task.status].push(task);
    return groups;
  });

  // Which column's "add task" input is currently open, if any.
  protected readonly addingTo = signal<TaskStatus | null>(null);
  protected newTaskTitle = '';

  constructor() {
    this.directory.ensureLoaded().subscribe();
  }

  // Required inputs aren't readable in the constructor — Angular hasn't
  // bound them yet at that point (NG0950) — so the initial fetch has to
  // wait until ngOnInit, by which point projectId() is guaranteed set.
  ngOnInit(): void {
    this.load();
  }

  /**
   * Only `status` drives the board (the 4-value enum every task has), not
   * project-service's separate, arbitrarily-named BoardColumn/columnId —
   * "columns by task status" in the brief maps directly onto TaskStatus, and
   * driving the board off the fixed enum is far more robust than trying to
   * reconcile it with per-project custom columns.
   */
  drop(event: CdkDragDrop<Task[]>, targetStatus: TaskStatus): void {
    const task = event.item.data as Task;
    if (task.status === targetStatus) return;

    const previousStatus = task.status;
    // Optimistic: apply immediately, roll back only if the request fails.
    this.tasks.update((all) => all.map((t) => (t.id === task.id ? { ...t, status: targetStatus } : t)));

    this.tasksService.updateStatus(task.id, targetStatus).subscribe({
      error: () => {
        this.tasks.update((all) =>
          all.map((t) => (t.id === task.id ? { ...t, status: previousStatus } : t)),
        );
        this.toast.error(`Couldn't move "${task.title}" — reverted.`);
      },
    });
  }

  startAdding(status: TaskStatus): void {
    this.newTaskTitle = '';
    this.addingTo.set(status);
  }

  cancelAdding(): void {
    this.addingTo.set(null);
    this.newTaskTitle = '';
  }

  confirmAdd(status: TaskStatus): void {
    const title = this.newTaskTitle.trim();
    if (!title) {
      this.cancelAdding();
      return;
    }
    this.tasksService.create({ projectId: this.projectId(), title }).subscribe((created) => {
      if (status === 'todo') {
        this.tasks.update((all) => [...all, created]);
      } else {
        // CreateTaskDto has no status field (server defaults to todo) — set
        // it in a follow-up call when adding directly into another column.
        this.tasksService.updateStatus(created.id, status).subscribe((updated) => {
          this.tasks.update((all) => [...all, updated]);
        });
      }
    });
    this.cancelAdding();
  }

  openTask(task: Task): void {
    this.router.navigate(['/projects', this.projectId(), 'tasks', task.id]);
  }

  deleteTask(task: Task): void {
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
          this.tasks.update((all) => all.filter((t) => t.id !== task.id));
        });
      });
  }

  private load(): void {
    this.tasksService.listByProject(this.projectId()).subscribe({
      next: (tasks) => {
        this.tasks.set(tasks);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
