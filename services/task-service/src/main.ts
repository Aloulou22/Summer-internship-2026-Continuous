import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  // A bare enableCors() defaults to Access-Control-Allow-Origin: '*', which
  // browsers reject once the gateway's proxied response carries credentials
  // (Angular sends withCredentials: true on every request). Reflect the
  // origin instead, matching the gateway and auth-service.
  // maxAge lets the browser cache the preflight decision instead of sending
  // an extra OPTIONS request before nearly every call.
  app.enableCors({ origin: true, credentials: true, maxAge: 86400 });

  const config = new DocumentBuilder()
    .setTitle('Task Service')
    .setDescription('Tasks, subtasks, comments & history for TaskFlow. Publishes task-events.')
    .setVersion('0.1')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config));

  const port = process.env.PORT || 3004;
  await app.listen(port);
  console.log(`Task service: HTTP on :${port}, Kafka producer active`);
}
bootstrap();
