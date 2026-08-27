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
            client: {
              clientId: 'task-service',
              brokers: [config.get<string>('KAFKA_BROKER')],
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
