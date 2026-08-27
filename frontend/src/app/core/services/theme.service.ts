import { Injectable, effect, signal } from '@angular/core';

export type ThemePreference = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'tf-theme';

/**
 * Applies the user's theme preference to the <html data-theme> attribute
 * that styles.scss's Material color mixins are scoped to. 'system' clears
 * the attribute so the `prefers-color-scheme` media query takes over.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly preference = signal<ThemePreference>(this.readStored());

  constructor() {
    effect(() => {
      const value = this.preference();
      localStorage.setItem(STORAGE_KEY, value);
      const root = document.documentElement;
      if (value === 'system') {
        root.removeAttribute('data-theme');
      } else {
        root.setAttribute('data-theme', value);
      }
    });
  }

  setPreference(preference: ThemePreference): void {
    this.preference.set(preference);
  }

  toggle(): void {
    const current = this.preference();
    const isDark = current === 'dark' || (current === 'system' && this.systemPrefersDark());
    this.setPreference(isDark ? 'light' : 'dark');
  }

  private systemPrefersDark(): boolean {
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  }

  private readStored(): ThemePreference {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
  }
}
