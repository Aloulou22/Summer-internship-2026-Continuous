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
  app.enableCors({ origin: true, credentials: true });

  const config = new DocumentBuilder()
    .setTitle('Project Service')
    .setDescription('Projects, members, categories & Kanban boards for TaskFlow')
    .setVersion('0.1')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config));

  const port = process.env.PORT || 3003;
  await app.listen(port);
  console.log(`Project service: HTTP on :${port}`);
}
bootstrap();
