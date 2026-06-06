import { IsEnum, IsOptional } from 'class-validator';

export class StatsQueryDto {
  @IsOptional()
  @IsEnum(['24h', '7d', '30d', 'all'])
  range?: '24h' | '7d' | '30d' | 'all' = '24h';
}
