import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';

async function bootstrap() {
  // 1. Create the normal HTTP app (for the frontend / API Gateway).
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  // A bare enableCors() defaults to Access-Control-Allow-Origin: '*', which
  // browsers reject once the gateway's proxied response carries credentials
  // (Angular sends withCredentials: true on every request). Reflect the
  // origin instead, matching the gateway and auth-service.
  app.enableCors({ origin: true, credentials: true });

  const config = new DocumentBuilder()
    .setTitle('User Service')
    .setDescription('Profiles & teams for TaskFlow')
    .setVersion('0.1')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config));

  // 2. HYBRID: attach a Kafka CONSUMER to the same app.
  //    This is what lets one NestJS app be BOTH an HTTP server AND a
  //    Kafka microservice at the same time.
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: 'user-service',
        brokers: [process.env.KAFKA_BROKER],
      },
      consumer: { groupId: 'user-service-consumer' },
    },
  });

  // 3. Start the Kafka listener, then the HTTP listener.
  await app.startAllMicroservices();

  const port = process.env.PORT || 3002;
  await app.listen(port);
  console.log(`User service: HTTP on :${port}, Kafka consumer active`);
}
bootstrap();
