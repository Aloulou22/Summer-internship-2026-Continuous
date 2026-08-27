import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class CreateSubtaskDto {
  @ApiProperty({ example: 'Write the wireframe' })
  @IsString()
  @MinLength(1)
  title: string;
}
