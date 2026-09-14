import { Injectable } from '@angular/core';

import { environment } from '../../../environments/environment';

/**
 * Wakes every backend service the moment the app loads.
 *
 * On Render's free tier each service sleeps after ~15 minutes without traffic
 * and takes 25-45s to boot. Requests the gateway relays to a sleeping service
 * come back 429 without waking it — only outside traffic does — so the browser
 * pings each service's public URL directly. By the time someone has typed
 * their credentials, the services behind login and the dashboard are already
 * starting.
 *
 * Fire-and-forget: `no-cors` responses are opaque and never read, and a failed
 * ping costs nothing (coldStartRetryInterceptor still covers the real calls).
 */
@Injectable({ providedIn: 'root' })
export class BackendWarmUpService {
  start(): void {
    for (const url of environment.warmUpUrls) {
      fetch(url, { mode: 'no-cors', cache: 'no-store' }).catch(() => undefined);
    }
  }
}
