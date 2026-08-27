import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

import { ToastService } from '../services/toast.service';

/**
 * Global HTTP error → toast. 401s are excluded: authInterceptor already
 * either retries them transparently after a token refresh, or clears the
 * session and redirects to /login — a generic toast on top would just be
 * noise (or fire right as the page is navigating away).
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  // inject() only works synchronously during the interceptor call — capture
  // it now, before the async catchError callback runs.
  const toast = inject(ToastService);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status !== 401) {
        toast.error(extractMessage(error));
      }
      return throwError(() => error);
    }),
  );
};

function extractMessage(error: HttpErrorResponse): string {
  // status 0 means the request never reached a server (gateway down, CORS,
  // offline...) — `error.error` here is a raw fetch/XHR error (e.g. a
  // TypeError with message "Failed to fetch"), not a backend payload, so it
  // must be checked before trying to read a `.message` off the body.
  if (error.status === 0) return "Can't reach the server — check your connection and try again.";

  const body: unknown = error.error;
  if (body && typeof body === 'object' && 'message' in body) {
    const message = (body as { message: unknown }).message;
    if (typeof message === 'string') return message;
    if (Array.isArray(message) && typeof message[0] === 'string') return message[0];
  }
  return 'Something went wrong. Please try again.';
}
