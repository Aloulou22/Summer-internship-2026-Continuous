export type NotificationType =
  | 'task_assigned'
  | 'task_status_changed'
  | 'task_deadline_reminder'
  | 'welcome';

// Named AppNotification, not Notification, to avoid colliding with the
// browser's global Notification API.
export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  // Only task_* types carry { taskId, projectId, ... } — set by
  // notification-service's Kafka consumer (see notifications.service.ts).
  // 'welcome' has no metadata at all.
  metadata?: { taskId?: string; projectId?: string; status?: string; deadline?: string };
  read: boolean;
  createdAt: string;
}
