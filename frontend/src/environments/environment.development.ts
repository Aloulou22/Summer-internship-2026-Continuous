export const environment = {
  production: false,
  // Gateway's local docker-compose port (see docker-compose.yml api-gateway service).
  apiUrl: 'http://localhost:3000',
  // Local containers never sleep, so there's nothing to wake.
  warmUpUrls: [] as string[],
};
