import { plainToInstance } from 'class-transformer';
import { IsString, IsNumberString, IsUrl, IsOptional, MinLength, validateSync } from 'class-validator';

class EnvironmentVariables {
  @IsNumberString() PORT: string;
  @IsString() DB_HOST: string;
  @IsNumberString() DB_PORT: string;
  @IsString() DB_USER: string;
  @IsString() DB_PASSWORD: string;
  @IsString() DB_NAME: string;

  // MUST match the Auth service's secret so tokens verify. Same rule: >= 32 chars.
  @IsString()
  @MinLength(32, {
    message:
      'JWT_ACCESS_SECRET must be >= 32 chars AND match the Auth service secret. ' +
      'Generate: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"',
  })
  JWT_ACCESS_SECRET: string;

  @IsString() KAFKA_BROKER: string;

  // Set both to enable SASL/SCRAM + TLS for a hosted broker (e.g. Redpanda
  // Cloud). Leave unset for an unauthenticated local broker.
  @IsOptional() @IsString() KAFKA_SASL_USERNAME?: string;
  @IsOptional() @IsString() KAFKA_SASL_PASSWORD?: string;

  @IsString() REDIS_HOST: string;
  @IsNumberString() REDIS_PORT: string;

  // Task Service has no membership data of its own (Database per Service) —
  // it asks Project Service "is this caller a member of this project?"
  // over HTTP before allowing any read/write on a task. See
  // src/projects/projects-client.service.ts.
  @IsUrl({ require_tld: false })
  PROJECT_SERVICE_URL: string;
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
