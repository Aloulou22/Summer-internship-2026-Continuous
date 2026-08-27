import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** A circular avatar — an image when `imageUrl` is set, otherwise initials from `name`. */
@Component({
  selector: 'tf-avatar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (imageUrl()) {
      <img [src]="imageUrl()" [alt]="name()" />
    } @else {
      {{ initials() }}
    }
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      width: var(--tf-avatar-size, 32px);
      height: var(--tf-avatar-size, 32px);
      border-radius: var(--mat-sys-corner-full);
      background: var(--mat-sys-primary-container);
      color: var(--mat-sys-on-primary-container);
      font-size: calc(var(--tf-avatar-size, 32px) * 0.4);
      font-weight: 700;
      letter-spacing: 0.02em;
      flex-shrink: 0;
      user-select: none;
    }
    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  `,
  host: {
    '[style.--tf-avatar-size]': 'size()',
  },
})
export class AvatarComponent {
  readonly name = input.required<string>();
  readonly size = input('32px');
  readonly imageUrl = input<string | undefined>(undefined);

  protected readonly initials = computed(() =>
    this.name()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join(''),
  );
}
