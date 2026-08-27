import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** A shimmering placeholder block shown while async data loads. */
@Component({
  selector: 'tf-skeleton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '',
  styles: `
    :host {
      display: block;
      width: var(--tf-skeleton-width, 100%);
      height: var(--tf-skeleton-height, 1rem);
      border-radius: var(--tf-skeleton-radius, var(--mat-sys-corner-small));
      background: linear-gradient(
        90deg,
        var(--mat-sys-surface-container-high) 25%,
        var(--mat-sys-surface-container-highest) 37%,
        var(--mat-sys-surface-container-high) 63%
      );
      background-size: 400% 100%;
      animation: tf-skeleton-shimmer 1.6s ease-in-out infinite;
    }

    @keyframes tf-skeleton-shimmer {
      0% {
        background-position: 100% 50%;
      }
      100% {
        background-position: 0 50%;
      }
    }
  `,
  host: {
    '[style.--tf-skeleton-width]': 'width()',
    '[style.--tf-skeleton-height]': 'height()',
    '[style.--tf-skeleton-radius]': 'radius() ?? null',
    role: 'presentation',
    'aria-hidden': 'true',
  },
})
export class SkeletonComponent {
  readonly width = input('100%');
  readonly height = input('1rem');
  readonly radius = input<string>();
}
