import { PartialType } from '@nestjs/swagger';
import { CreateBoardColumnDto } from './create-board-column.dto';

export class UpdateBoardColumnDto extends PartialType(CreateBoardColumnDto) {}
