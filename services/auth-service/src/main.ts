import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Reject any request body that doesn't match the DTO validation rules.
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true }),
  );

  app.enableCors();

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
