import { plainToInstance } from 'class-transformer';
import { IsString, IsNumberString, IsUrl, IsOptional, MinLength, validateSync } from 'class-validator';

class EnvironmentVariables {
  @IsNumberString() PORT: string;

  // MUST match the Auth service's secret so tokens verify. Same rule: >= 32 chars.
  @IsString()
  @MinLength(32, {
    message:
      'JWT_ACCESS_SECRET must be >= 32 chars AND match the Auth service secret. ' +
      'Generate: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"',
  })
  JWT_ACCESS_SECRET: string;

  // Full URL to each downstream service. Locally this is the docker-compose
  // hostname (http://task-service:3004); on Render it's that service's own
  // RENDER_EXTERNAL_URL — Render free-tier web services can send private-
  // network requests but can't RECEIVE them, so proxying has to go over
  // each service's public onrender.com URL instead (see render.yaml).
  @IsUrl({ require_tld: false }) AUTH_SERVICE_URL: string;
  @IsUrl({ require_tld: false }) USER_SERVICE_URL: string;
  @IsUrl({ require_tld: false }) PROJECT_SERVICE_URL: string;
  @IsUrl({ require_tld: false }) TASK_SERVICE_URL: string;
  @IsUrl({ require_tld: false }) NOTIFICATION_SERVICE_URL: string;

  // The browser origin allowed to send credentialed (cookie) requests. This
  // is the hop that actually matters for the refresh-token cookie, since
  // browsers only ever talk to the gateway, never to Auth directly.
  @IsOptional()
  @IsString()
  CORS_ORIGIN?: string;
}

export function validateEnv(config: Record<string, unknown>) {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) {
    throw new Error('Invalid environment configuration:\n' + errors.toString());
  }
  return validated;
}
