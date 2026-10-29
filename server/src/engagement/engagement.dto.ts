import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { SHARE_NETWORKS, type ShareNetwork } from './engagement.entities';

export class PostCountsDto {
  @ApiProperty() slug: string;
  @ApiProperty() likes: number;
  @ApiProperty() shares: number;
}

export class PostStatsDto extends PostCountsDto {
  @ApiProperty({ description: 'Whether this visitor has liked the post' }) liked: boolean;
  @ApiProperty({ example: true }) ok: boolean;
}

export class ShareDto {
  @ApiProperty({ enum: SHARE_NETWORKS })
  @IsIn(SHARE_NETWORKS, { message: 'Unknown network' })
  network: ShareNetwork;
}
