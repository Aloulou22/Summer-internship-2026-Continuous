import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

/** Compact inline empty state for a section/list (as opposed to tf-placeholder-page, which is a whole route). */
@Component({
  selector: 'tf-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  template: `
    <mat-icon class="tf-empty-state__icon">{{ icon() }}</mat-icon>
    <p class="tf-empty-state__title">{{ title() }}</p>
    @if (message()) {
      <p class="tf-empty-state__message">{{ message() }}</p>
    }
    <ng-content />
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: var(--tf-space-1);
      padding: var(--tf-space-6) var(--tf-space-4);
      color: var(--mat-sys-on-surface-variant);
    }
    .tf-empty-state__icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
      margin-bottom: var(--tf-space-2);
      opacity: 0.6;
    }
    .tf-empty-state__title {
      margin: 0;
      font-weight: 600;
      color: var(--mat-sys-on-surface);
    }
    .tf-empty-state__message {
      margin: 0;
      font-size: 0.875rem;
      max-width: 32ch;
    }
  `,
})
export class EmptyStateComponent {
  readonly icon = input('inbox');
  readonly title = input('Nothing here yet');
  readonly message = input<string>();
}
