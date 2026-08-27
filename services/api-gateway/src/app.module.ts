import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/env.validation';

// No database, no business logic — the gateway only verifies the JWT and
// proxies to the 5 microservices. Routing lives in main.ts alongside the
// bootstrap, since it's plain Express middleware wiring, not Nest
// controllers/providers.
@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, validate: validateEnv })],
})
export class AppModule {}
