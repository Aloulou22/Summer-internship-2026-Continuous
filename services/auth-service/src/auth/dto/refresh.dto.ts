import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

// Optional now: browsers send it via the httpOnly refreshToken cookie
// instead (see auth.controller.ts). Non-browser clients (Postman, tests)
// can still pass it explicitly in the body.
export class RefreshDto {
  @ApiPropertyOptional({ description: 'The refresh token issued at login (omit to use the refreshToken cookie instead)' })
  @IsOptional()
  @IsString()
  refreshToken?: string;
}
