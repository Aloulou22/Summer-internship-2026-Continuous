import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsUUID, IsOptional, MinLength } from 'class-validator';

export class CreateProfileDto {
  @ApiProperty({ description: 'User id issued by the Auth service' })
  @IsUUID()
  userId: string;

  @ApiProperty({ example: 'Fares' })
  @IsString()
  @MinLength(2)
  fullName: string;

  @ApiPropertyOptional({ example: 'Backend Developer' })
  @IsOptional()
  @IsString()
  jobTitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  avatarUrl?: string;
}
