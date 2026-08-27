import { TaskPriority, TaskStatus } from '../../core/models/task.model';

interface StatusMeta {
  label: string;
  icon: string;
  colorVar: string;
}

interface PriorityMeta {
  label: string;
  icon: string;
  colorVar: string;
  bgVar: string;
}

// colorVar/bgVar reference the semantic custom properties defined in
// styles.scss (--tf-status-*, --tf-priority-*) so chips, Kanban columns and
// task-detail all draw from one source of truth.
export const TASK_STATUS_META: Record<TaskStatus, StatusMeta> = {
  todo: { label: 'To Do', icon: 'radio_button_unchecked', colorVar: '--tf-status-todo' },
  in_progress: { label: 'In Progress', icon: 'autorenew', colorVar: '--tf-status-in-progress' },
  in_review: { label: 'In Review', icon: 'rate_review', colorVar: '--tf-status-in-review' },
  done: { label: 'Done', icon: 'check_circle', colorVar: '--tf-status-done' },
};

export const TASK_PRIORITY_META: Record<TaskPriority, PriorityMeta> = {
  low: {
    label: 'Low',
    icon: 'keyboard_double_arrow_down',
    colorVar: '--tf-priority-low',
    bgVar: '--tf-priority-low-bg',
  },
  medium: {
    label: 'Medium',
    icon: 'remove',
    colorVar: '--tf-priority-medium',
    bgVar: '--tf-priority-medium-bg',
  },
  high: {
    label: 'High',
    icon: 'keyboard_double_arrow_up',
    colorVar: '--tf-priority-high',
    bgVar: '--tf-priority-high-bg',
  },
  urgent: {
    label: 'Urgent',
    icon: 'priority_high',
    colorVar: '--tf-priority-urgent',
    bgVar: '--tf-priority-urgent-bg',
  },
};
