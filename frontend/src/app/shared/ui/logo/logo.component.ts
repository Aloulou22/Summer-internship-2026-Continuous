import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Brand mark: three staggered rounded tiles (Kanban columns at a glance).
 * Pure inline SVG so it stays crisp at any size with no asset request.
 */
@Component({
  selector: 'tf-logo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      [attr.width]="size()"
      [attr.height]="size()"
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
    >
      <rect x="2" y="14" width="9" height="16" rx="3.5" fill="var(--mat-sys-primary)" />
      <rect x="12.5" y="6" width="9" height="24" rx="3.5" fill="var(--mat-sys-tertiary)" />
      <rect
        x="23"
        y="2"
        width="9"
        height="16"
        rx="3.5"
        fill="var(--mat-sys-primary)"
        opacity="0.45"
      />
    </svg>
    @if (wordmark()) {
      <span class="tf-logo__word">TaskFlow</span>
    }
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: var(--tf-space-2);
    }
    .tf-logo__word {
      font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;
      font-weight: 800;
      font-size: 1.125rem;
      letter-spacing: -0.01em;
      color: var(--mat-sys-on-surface);
      white-space: nowrap;
    }
  `,
})
export class LogoComponent {
  readonly size = input(32);
  readonly wordmark = input(false);
}
