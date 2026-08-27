import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

import { TaskPriority } from '../../../core/models/task.model';
import { TASK_PRIORITY_META } from '../../constants/task-meta';

@Component({
  selector: 'tf-priority-chip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  template: `
    <mat-icon>{{ meta().icon }}</mat-icon>
    <span>{{ meta().label }}</span>
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      padding: 2px var(--tf-space-2);
      border-radius: var(--mat-sys-corner-full);
      background: var(--chip-bg);
      color: var(--chip-color);
      font-size: 0.75rem;
      font-weight: 600;
      line-height: 1.4;
    }
    mat-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }
  `,
  host: {
    '[style.--chip-color]': '"var(" + meta().colorVar + ")"',
    '[style.--chip-bg]': '"var(" + meta().bgVar + ")"',
  },
})
export class PriorityChipComponent {
  readonly priority = input.required<TaskPriority>();
  protected readonly meta = computed(() => TASK_PRIORITY_META[this.priority()]);
}
