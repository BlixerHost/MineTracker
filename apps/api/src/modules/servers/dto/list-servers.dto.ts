import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ListServersDto {
  @IsOptional()
  @IsEnum(['JAVA', 'BEDROCK'])
  type?: 'JAVA' | 'BEDROCK';

  @IsOptional()
  @IsEnum(['ONLINE', 'OFFLINE'])
  status?: 'ONLINE' | 'OFFLINE';

  @IsOptional()
  @IsString()
  @Length(1, 50)
  version?: string;

  @IsOptional()
  @IsString()
  @Length(2, 2)
  country?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsEnum(['players_online', 'name', 'created_at', 'uptime'])
  sort?: 'players_online' | 'name' | 'created_at' | 'uptime' = 'players_online';

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  order?: 'asc' | 'desc' = 'desc';
}
