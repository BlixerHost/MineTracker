import { IsOptional, IsString, Length } from 'class-validator';

export class ReviewSubmissionDto {
  @IsOptional()
  @IsString()
  @Length(0, 500)
  notes?: string;
}
