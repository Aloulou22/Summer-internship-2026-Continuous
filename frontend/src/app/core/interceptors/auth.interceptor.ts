import { inject } from '@angular/core';
import {
  HttpErrorResponse,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';

// /auth/login and /auth/register have no token to send yet; /auth/refresh and
// /auth/logout must NOT trigger the 401 retry below (that would recurse).
const AUTH_ENDPOINT = /\/auth\/(login|register|refresh|logout)$/;

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // Only the gateway needs credentials/the bearer token — leave anything
  // else (e.g. Google Fonts) untouched.
  if (!req.url.startsWith(environment.apiUrl)) {
    return next(req);
  }

  const isAuthEndpoint = AUTH_ENDPOINT.test(req.url);
  const authedReq = attachAuth(req, auth, isAuthEndpoint);

  return next(authedReq).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401 && !isAuthEndpoint) {
        return auth.refreshSession().pipe(
          switchMap(() => next(attachAuth(req, auth, isAuthEndpoint))),
          catchError((refreshError: unknown) => {
            auth.clearSession();
            router.navigate(['/login'], { queryParams: { returnUrl: router.url } });
            return throwError(() => refreshError);
          }),
        );
      }
      return throwError(() => error);
    }),
  );
};

function attachAuth(
  req: HttpRequest<unknown>,
  auth: AuthService,
  skipToken: boolean,
): HttpRequest<unknown> {
  const token = auth.accessToken;
  return req.clone({
    withCredentials: true,
    setHeaders: token && !skipToken ? { Authorization: `Bearer ${token}` } : {},
  });
}
