import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { retry, throwError, timer } from 'rxjs';

import { environment } from '../../../environments/environment';

/**
 * Rides out Render free-tier cold starts. While a sleeping service boots
 * (~25-45s), requests the gateway relays to it come back 429 — or the gateway
 * itself answers 502/503/504. Retrying with backoff turns that window into a
 * slow request instead of an error toast. (The retries don't wake the service;
 * BackendWarmUpService does that from the browser on app load.)
 *
 * 429 is retried for every method: the hosting edge rejected the request
 * before the app saw it, so nothing was applied. 5xx and network errors are
 * retried only for safe methods — a POST that failed midway may already have
 * taken effect (a refresh-token rotation, a created task), and replaying it
 * isn't safe.
 */
const MAX_RETRIES = 9; // backoff 1+2+4+8+10+10+10+10+10 = 65s
const MAX_DELAY_MS = 10_000;
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const TRANSIENT_STATUSES = new Set([0, 502, 503, 504]);

export const coldStartRetryInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiUrl)) {
    return next(req);
  }

  return next(req).pipe(
    retry({
      count: MAX_RETRIES,
      delay: (error: unknown, retryCount: number) =>
        isColdStart(error, req.method)
          ? timer(Math.min(1000 * 2 ** (retryCount - 1), MAX_DELAY_MS))
          : throwError(() => error),
    }),
  );
};

function isColdStart(error: unknown, method: string): boolean {
  if (!(error instanceof HttpErrorResponse)) return false;
  if (error.status === 429) return true;
  return SAFE_METHODS.has(method) && TRANSIENT_STATUSES.has(error.status);
}
