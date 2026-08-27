import { NotificationType } from '../../core/models/notification.model';

export const NOTIFICATION_ICON: Record<NotificationType, string> = {
  task_assigned: 'assignment_ind',
  task_status_changed: 'sync_alt',
  task_deadline_reminder: 'alarm',
  welcome: 'celebration',
};
