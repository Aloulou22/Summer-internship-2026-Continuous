import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Reject any request body that doesn't match the DTO validation rules.
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true }),
  );

  // Needed to read the refresh-token httpOnly cookie on /auth/refresh and
  // /auth/logout (see auth.controller.ts).
  app.use(cookieParser());

  // credentials: true is required for the browser to send/receive the
  // refresh-token cookie. A wildcard origin is rejected by browsers when
  // credentials are involved, so this reflects the caller's origin (or uses
  // CORS_ORIGIN if pinned) instead of '*'.
  const configService = app.get(ConfigService);
  app.enableCors({
    origin: configService.get<string>('CORS_ORIGIN') || true,
    credentials: true,
  });

  // Swagger UI available at /docs
  const config = new DocumentBuilder()
    .setTitle('Auth Service')
    .setDescription('Authentication & authorization for TaskFlow')
    .setVersion('0.1')
    .addBearerAuth()
    .build();
  const doc = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, doc);

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`Auth service running on http://localhost:${port} (docs at /docs)`);
}
bootstrap();
