import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

import { TaskStatus } from '../../../core/models/task.model';
import { TASK_STATUS_META } from '../../constants/task-meta';

@Component({
  selector: 'tf-status-chip',
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
      gap: var(--tf-space-1);
      color: var(--chip-color);
      font-size: 0.8125rem;
      font-weight: 600;
    }
    mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }
  `,
  host: {
    '[style.--chip-color]': '"var(" + meta().colorVar + ")"',
  },
})
export class StatusChipComponent {
  readonly status = input.required<TaskStatus>();
  protected readonly meta = computed(() => TASK_STATUS_META[this.status()]);
}
