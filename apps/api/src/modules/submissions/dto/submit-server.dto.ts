import {
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Max,
  Min,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';

const sanitize = (v: string) =>
  v.replace(/<[^>]*>/g, '').trim();

export class SubmitServerDto {
  @IsString()
  @Length(1, 100)
  @Transform(({ value }: { value: string }) => sanitize(value))
  name: string;

  @IsString()
  @Length(1, 255)
  @Transform(({ value }: { value: string }) => value.trim().toLowerCase())
  // Hostname or IPv4/IPv6 — deeper validation happens in service via SSRF guard
  @Matches(/^[a-zA-Z0-9._:[\]-]+$/, {
    message: 'host contains invalid characters',
  })
  host: string;

  @IsInt()
  @Min(1)
  @Max(65535)
  port: number;

  @IsEnum(['JAVA', 'BEDROCK'])
  type: 'JAVA' | 'BEDROCK';

  @IsOptional()
  @IsUrl({ require_tld: true, protocols: ['http', 'https'] })
  @Length(0, 512)
  websiteUrl?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  @Length(0, 512)
  discordUrl?: string;

  @IsOptional()
  @IsEmail()
  @Length(0, 255)
  contactEmail?: string;

  // Honeypot — must be empty; bots usually fill all fields
  @IsOptional()
  @IsString()
  website?: string;
}
