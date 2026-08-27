import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  Comment,
  CreateTaskRequest,
  Subtask,
  Task,
  TaskDetail,
  TaskStatus,
  UpdateTaskRequest,
} from '../models/task.model';

@Injectable({ providedIn: 'root' })
export class TasksService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/tasks`;

  /**
   * GET /tasks?projectId=… — task-service has no cross-project "my tasks"
   * endpoint, only per-project listing (caller must be a member of that
   * project). Callers that need an all-projects view (dashboard) fetch the
   * user's projects first and fan this out per project.
   */
  listByProject(projectId: string): Observable<Task[]> {
    return this.http.get<Task[]>(this.base, { params: { projectId } });
  }

  /** GET /tasks/:id — eagerly loads subtasks/comments/history in one call. */
  getOne(id: string): Observable<TaskDetail> {
    return this.http.get<TaskDetail>(`${this.base}/${id}`);
  }

  /** POST /tasks — publishes TaskCreated on task-events (notification-service consumes it). */
  create(dto: CreateTaskRequest): Observable<Task> {
    return this.http.post<Task>(this.base, dto);
  }

  update(id: string, dto: UpdateTaskRequest): Observable<TaskDetail> {
    return this.http.patch<TaskDetail>(`${this.base}/${id}`, dto);
  }

  /** PATCH /tasks/:id/status — publishes TaskStatusChanged. This is what the Kanban drag-drop calls. */
  updateStatus(id: string, status: TaskStatus): Observable<Task> {
    return this.http.patch<Task>(`${this.base}/${id}/status`, { status });
  }

  // AssignTaskDto requires a real UUID (no @IsOptional()), so this endpoint
  // can only set an assignee, not clear one — matches backend validation.
  /** PATCH /tasks/:id/assign — publishes TaskAssigned. */
  assign(id: string, assigneeId: string): Observable<TaskDetail> {
    return this.http.patch<TaskDetail>(`${this.base}/${id}/assign`, { assigneeId });
  }

  remove(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/${id}`);
  }

  // --- Subtasks ---------------------------------------------------------------
  addSubtask(taskId: string, title: string): Observable<Subtask> {
    return this.http.post<Subtask>(`${this.base}/${taskId}/subtasks`, { title });
  }

  updateSubtask(taskId: string, subtaskId: string, dto: { title?: string; done?: boolean }): Observable<Subtask> {
    return this.http.patch<Subtask>(`${this.base}/${taskId}/subtasks/${subtaskId}`, dto);
  }

  removeSubtask(taskId: string, subtaskId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/${taskId}/subtasks/${subtaskId}`);
  }

  // --- Comments ------------------------------------------------------------
  addComment(taskId: string, content: string): Observable<Comment> {
    return this.http.post<Comment>(`${this.base}/${taskId}/comments`, { content });
  }
}
