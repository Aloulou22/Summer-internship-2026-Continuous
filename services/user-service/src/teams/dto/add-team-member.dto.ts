import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class AddTeamMemberDto {
  @ApiProperty({ description: 'User id issued by the Auth service' })
  @IsUUID()
  userId: string;
}
