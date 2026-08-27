// Mirrors task-service's Task/Subtask/Comment/TaskHistory entities.
export type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Task {
  id: string;
  projectId: string;
  columnId?: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  reporterId: string;
  assigneeId?: string;
  deadline?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Subtask {
  id: string;
  taskId: string;
  title: string;
  done: boolean;
  createdAt: string;
}

export interface Comment {
  id: string;
  taskId: string;
  authorId: string;
  content: string;
  createdAt: string;
}

export interface TaskHistoryEntry {
  id: string;
  taskId: string;
  userId: string;
  field: string;
  oldValue?: string;
  newValue?: string;
  createdAt: string;
}

export interface CreateTaskRequest {
  projectId: string;
  columnId?: string;
  title: string;
  description?: string;
  priority?: TaskPriority;
  assigneeId?: string;
  deadline?: string;
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  assigneeId?: string;
  deadline?: string;
  columnId?: string;
}

// GET /tasks/:id loads the subtasks/comments/history relations eagerly —
// one call returns everything the detail page needs.
export interface TaskDetail extends Task {
  subtasks: Subtask[];
  comments: Comment[];
  history: TaskHistoryEntry[];
}
