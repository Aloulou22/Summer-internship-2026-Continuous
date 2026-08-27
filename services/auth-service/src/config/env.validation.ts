import { plainToInstance } from 'class-transformer';
import { IsEmail, IsString, IsNumberString, IsOptional, MinLength, validateSync } from 'class-validator';

// This class defines exactly which env vars must exist and their rules.
// If any are missing or invalid, the app throws on startup instead of
// running with a broken/insecure config. Nothing is silently defaulted.
class EnvironmentVariables {
  @IsNumberString()
  PORT: string;

  @IsString()
  DB_HOST: string;

  @IsNumberString()
  DB_PORT: string;

  @IsString()
  DB_USER: string;

  @IsString()
  DB_PASSWORD: string;

  @IsString()
  DB_NAME: string;

  // A real secret must be long. This rejects "change_me" style placeholders.
  @IsString()
  @MinLength(32, {
    message:
      'JWT_ACCESS_SECRET must be at least 32 chars. Generate one with: ' +
      'node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"',
  })
  JWT_ACCESS_SECRET: string;

  @IsString()
  JWT_ACCESS_TTL: string;

  @IsNumberString()
  REFRESH_TTL_DAYS: string;

  @IsString()
  KAFKA_BROKER: string;

  // Set both to enable SASL/SCRAM + TLS for a hosted broker (e.g. Redpanda
  // Cloud). Leave unset for an unauthenticated local broker.
  @IsOptional() @IsString() KAFKA_SASL_USERNAME?: string;
  @IsOptional() @IsString() KAFKA_SASL_PASSWORD?: string;

  // The browser origin allowed to send credentialed (cookie) requests here.
  // Optional: falls back to reflecting the request origin (dev-friendly).
  // Set explicitly in production instead of relying on the reflection default.
  @IsOptional()
  @IsString()
  CORS_ORIGIN?: string;

  // Bootstrap admin: on startup, if set, this account is created (or an
  // existing account with this email is promoted) with role=admin — the
  // only way to obtain the very first admin without editing the database
  // directly. Leave both unset to skip bootstrapping in this environment.
  @IsOptional()
  @IsEmail()
  ADMIN_EMAIL?: string;

  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'ADMIN_PASSWORD must be at least 8 chars' })
  ADMIN_PASSWORD?: string;
}

export function validateEnv(config: Record<string, unknown>) {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });

  if (errors.length > 0) {
    throw new Error(
      'Invalid environment configuration:\n' + errors.toString(),
    );
  }
  return validated;
}
