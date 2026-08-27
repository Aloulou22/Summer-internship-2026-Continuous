import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';

// Registers a Kafka PRODUCER client this service can inject to emit events.
// Same pattern as auth-service's AuthModule — Task Service is the producer
// for task-events, exactly like Auth is the producer for user.registered.
@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: 'KAFKA_CLIENT',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.KAFKA,
          options: {
            // SASL/SCRAM only kicks in when KAFKA_SASL_USERNAME is set (e.g.
            // a hosted broker like Redpanda Cloud) — local docker-compose's
            // Kafka has no auth, so those stay unset and this is skipped.
            client: {
              clientId: 'task-service',
              brokers: [config.get<string>('KAFKA_BROKER')],
              ...(config.get<string>('KAFKA_SASL_USERNAME') && {
                ssl: true,
                sasl: {
                  mechanism: 'scram-sha-256' as const,
                  username: config.get<string>('KAFKA_SASL_USERNAME'),
                  password: config.get<string>('KAFKA_SASL_PASSWORD'),
                },
              }),
            },
            // A producer still needs a consumer group id declared by kafkajs.
            consumer: { groupId: 'task-service-producer' },
          },
        }),
      },
    ]),
  ],
  exports: [ClientsModule],
})
export class KafkaModule {}
