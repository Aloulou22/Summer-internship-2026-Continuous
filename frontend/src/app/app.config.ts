import {
  ApplicationConfig,
  provideZoneChangeDetection,
  provideAppInitializer,
  inject,
} from '@angular/core';
import {
  provideRouter,
  withComponentInputBinding,
  withViewTransitions,
  withPreloading,
  PreloadAllModules,
} from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { MatIconRegistry } from '@angular/material/icon';
import { provideNativeDateAdapter } from '@angular/material/core';
import { firstValueFrom } from 'rxjs';

import { routes } from './app.routes';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { AuthService } from './core/services/auth.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withViewTransitions(),
      withPreloading(PreloadAllModules),
    ),
    // errorInterceptor is outermost (sees the final settled result once
    // authInterceptor's own 401-retry logic has already run); authInterceptor
    // is innermost, closest to the actual HTTP call, so its retry doesn't
    // loop back through the toast interceptor.
    provideHttpClient(withFetch(), withInterceptors([errorInterceptor, authInterceptor])),
    provideAnimationsAsync(),
    provideNativeDateAdapter(),
    // Material Symbols Outlined instead of the legacy "Material Icons" font
    // (loaded in index.html) for every <mat-icon> in the app.
    provideAppInitializer(() => {
      inject(MatIconRegistry).setDefaultFontSetClass('material-symbols-outlined');
    }),
    // Silently exchange the refresh cookie (if any) for a session before the
    // router's first navigation, so a page reload doesn't flash the login
    // screen for an already-signed-in user. provideRouter defers initial
    // navigation until app initializers resolve, so route guards below
    // always see the restored (or cleared) session.
    provideAppInitializer(() => firstValueFrom(inject(AuthService).tryRestoreSession())),
  ],
};
