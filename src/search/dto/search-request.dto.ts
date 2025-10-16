import { IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';

export class SearchRequestDto {
  @IsString()
  query: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  limit?: number = 5;
}