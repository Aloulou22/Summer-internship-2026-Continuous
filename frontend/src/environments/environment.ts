export const environment = {
  production: true,
  // Single entry point for every backend call — the API Gateway. No API
  // request ever addresses a service directly.
  apiUrl: 'https://api-gateway-xafr.onrender.com',
  // The one exception: bare, fire-and-forget pings on app load to wake each
  // service from Render's free-tier sleep, which relayed gateway traffic
  // can't do. No credentials, no data — see BackendWarmUpService.
  warmUpUrls: [
    'https://api-gateway-xafr.onrender.com/',
    'https://auth-service-9kzh.onrender.com/',
    'https://user-service-chvv.onrender.com/',
    'https://project-service-w2a0.onrender.com/',
    'https://task-service-sfqn.onrender.com/',
    'https://notification-service-y1uh.onrender.com/',
  ] as string[],
};
