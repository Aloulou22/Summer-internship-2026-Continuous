import { plainToInstance } from 'class-transformer';
import { IsString, IsNumberString, IsOptional, MinLength, validateSync } from 'class-validator';

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

  // Bare host[:port] of each downstream service (e.g. "task-service:3004"),
  // not a full URL — main.ts prepends the http:// scheme itself. Render's
  // private-network hostnames are generated per-service and can't be
  // hardcoded, so these come from fromService in render.yaml.
  @IsString() AUTH_SERVICE_URL: string;
  @IsString() USER_SERVICE_URL: string;
  @IsString() PROJECT_SERVICE_URL: string;
  @IsString() TASK_SERVICE_URL: string;
  @IsString() NOTIFICATION_SERVICE_URL: string;

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
