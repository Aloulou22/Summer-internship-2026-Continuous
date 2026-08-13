import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateProfileDto } from './create-profile.dto';

// Same fields as create, all optional, but userId can't be changed.
export class UpdateProfileDto extends PartialType(
  OmitType(CreateProfileDto, ['userId'] as const),
) {}
