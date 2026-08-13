import { plainToInstance } from 'class-transformer';
import { IsString, IsNumberString, MinLength, validateSync } from 'class-validator';

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
