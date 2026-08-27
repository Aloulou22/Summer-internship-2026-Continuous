import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service';

// Global so any feature module can inject RedisService without re-importing it.
@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: RedisService,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new RedisService(config.get<string>('REDIS_HOST'), Number(config.get('REDIS_PORT'))),
    },
  ],
  exports: [RedisService],
})
export class RedisModule {}
