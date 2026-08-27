import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

/**
 * Temporary stand-in for a route that hasn't been built yet. Lets the shell,
 * routing and navigation be verified end-to-end before each feature lands.
 */
@Component({
  selector: 'tf-placeholder-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  template: `
    <div class="tf-placeholder">
      <mat-icon class="tf-placeholder__icon">{{ icon() }}</mat-icon>
      <h1>{{ title() }}</h1>
      <p>{{ note() }}</p>
    </div>
  `,
  styles: `
    .tf-placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      gap: var(--tf-space-3);
      min-height: 60vh;
      color: var(--mat-sys-on-surface-variant);
    }
    .tf-placeholder__icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: var(--mat-sys-primary);
      opacity: 0.7;
    }
    h1 {
      color: var(--mat-sys-on-surface);
      font-size: 1.5rem;
    }
    p {
      margin: 0;
      max-width: 32ch;
    }
  `,
})
export class PlaceholderPageComponent {
  readonly icon = input('construction');
  readonly title = input('Coming soon');
  readonly note = input('This part of TaskFlow is being built next.');
}
