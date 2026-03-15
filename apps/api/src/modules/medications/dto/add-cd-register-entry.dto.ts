import {
  IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

enum CdAction {
  stock_received = 'stock_received',
  administered = 'administered',
  wasted = 'wasted',
  returned = 'returned',
  destroyed = 'destroyed',
  transferred = 'transferred',
}

export class AddCdRegisterEntryDto {
  @ApiProperty({ enum: CdAction })
  @IsEnum(CdAction)
  action: CdAction;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional() @IsNumber() @Min(0)
  quantity_in?: number;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional() @IsNumber() @Min(0)
  quantity_out?: number;

  /** UUID of the witness (required by CQC for CD records) */
  @ApiProperty()
  @IsUUID()
  witness_id: string;

  @ApiPropertyOptional()
  @IsOptional() @IsUUID()
  resident_id?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  notes?: string;
}
