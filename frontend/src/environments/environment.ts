export const environment = {
  production: true,
  // Single entry point for every backend call — the API Gateway. No API
  // request ever addresses a service directly.
  apiUrl: 'https://api-gateway-xafr.onrender.com',
  // The one exception: bare, fire-and-forget pings on app load to wake each
  // service from Render's free-tier sleep, which relayed gateway traffic
  // can't do. No credentials, no data — see BackendWarmUpService.
  // /docs because it's each service's only public route that answers 200
  // (a root-path 404 still wakes the service but logs a red console error).
  // The gateway isn't listed: the app's first real request goes straight to
  // it from the browser, which wakes it on its own.
  warmUpUrls: [
    'https://auth-service-9kzh.onrender.com/docs',
    'https://user-service-chvv.onrender.com/docs',
    'https://project-service-w2a0.onrender.com/docs',
    'https://task-service-sfqn.onrender.com/docs',
    'https://notification-service-y1uh.onrender.com/docs',
  ] as string[],
};
