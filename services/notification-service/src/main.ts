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
    .setTitle('Notification Service')
    .setDescription('Notifications for TaskFlow — consumes task-events and user.registered')
    .setVersion('0.1')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config));

  // 2. HYBRID: attach a Kafka CONSUMER to the same app, same pattern as
  //    user-service. Notification is a pure consumer — task-events and
  //    user.registered, no topics of its own to produce.
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: 'notification-service',
        brokers: [process.env.KAFKA_BROKER],
      },
      consumer: { groupId: 'notification-service-consumer' },
    },
  });

  // 3. Start the Kafka listener, then the HTTP listener.
  await app.startAllMicroservices();

  const port = process.env.PORT || 3005;
  await app.listen(port);
  console.log(`Notification service: HTTP on :${port}, Kafka consumer active`);
}
bootstrap();
