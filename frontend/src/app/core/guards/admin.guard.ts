import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';

// Runs after authGuard (this route is nested under the authenticated shell),
// so a null user here just means "not admin" — no need to redirect to /login.
export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.user()?.role === 'admin') return true;
  return router.createUrlTree(['/dashboard']);
};
