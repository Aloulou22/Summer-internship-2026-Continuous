import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class AssignTaskDto {
  @ApiProperty({ description: 'User id to assign the task to' })
  @IsUUID()
  assigneeId: string;
}
