import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ProjectsClientService } from './projects-client.service';

@Module({
  imports: [HttpModule],
  providers: [ProjectsClientService],
  exports: [ProjectsClientService],
})
export class ProjectsClientModule {}
