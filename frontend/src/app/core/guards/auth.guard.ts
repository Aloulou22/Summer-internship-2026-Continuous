import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';

// By the time any guard runs, tryRestoreSession() (provideAppInitializer in
// app.config.ts) has already resolved, so isAuthenticated() reflects whether
// the refresh cookie was valid — no need to trigger a refresh here too.
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) return true;
  return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};
