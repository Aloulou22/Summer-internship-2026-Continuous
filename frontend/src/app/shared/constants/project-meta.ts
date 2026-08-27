import { ProjectStatus } from '../../core/models/project.model';

interface ProjectStatusMeta {
  label: string;
  icon: string;
}

export const PROJECT_STATUS_META: Record<ProjectStatus, ProjectStatusMeta> = {
  planning: { label: 'Planning', icon: 'edit_calendar' },
  active: { label: 'Active', icon: 'bolt' },
  on_hold: { label: 'On hold', icon: 'pause_circle' },
  completed: { label: 'Completed', icon: 'task_alt' },
  archived: { label: 'Archived', icon: 'inventory_2' },
};
