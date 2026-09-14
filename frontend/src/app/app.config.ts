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
import { coldStartRetryInterceptor } from './core/interceptors/cold-start-retry.interceptor';
import { AuthService } from './core/services/auth.service';
import { BackendWarmUpService } from './core/services/backend-warm-up.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withViewTransitions(),
      withPreloading(PreloadAllModules),
    ),
    // Outermost to innermost: errorInterceptor sees only the final settled
    // result, after authInterceptor's 401-refresh logic has run; that in turn
    // sees a request only after coldStartRetryInterceptor has ridden out any
    // cold-start 429s, so a booting service never looks like an auth failure
    // and never toasts mid-retry.
    provideHttpClient(
      withFetch(),
      withInterceptors([errorInterceptor, authInterceptor, coldStartRetryInterceptor]),
    ),
    provideAnimationsAsync(),
    provideNativeDateAdapter(),
    // Material Symbols Outlined instead of the legacy "Material Icons" font
    // (loaded in index.html) for every <mat-icon> in the app.
    provideAppInitializer(() => {
      inject(MatIconRegistry).setDefaultFontSetClass('material-symbols-outlined');
    }),
    // Start waking the backend immediately, in parallel with everything below
    // (not awaited) — see BackendWarmUpService.
    provideAppInitializer(() => {
      inject(BackendWarmUpService).start();
    }),
    // Silently exchange the refresh cookie (if any) for a session before the
    // router's first navigation, so a page reload doesn't flash the login
    // screen for an already-signed-in user. provideRouter defers initial
    // navigation until app initializers resolve, so route guards below
    // always see the restored (or cleared) session.
    provideAppInitializer(() => firstValueFrom(inject(AuthService).tryRestoreSession())),
  ],
};
