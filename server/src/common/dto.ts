import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class OkDto {
  @ApiProperty({ example: true }) ok: boolean;
}

/** Wraps a paged list: { data, total, page, pageSize }. */
export class PageMeta {
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() pageSize: number;
}

/** ?page=&pageSize= on every paged list. */
export class PageQuery {
  @ApiPropertyOptional({ default: 1 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 50, maximum: 200 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200)
  pageSize?: number;
}
