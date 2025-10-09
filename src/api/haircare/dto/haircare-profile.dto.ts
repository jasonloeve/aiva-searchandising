import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';

/**
 * DTO for haircare customer profile
 * Used for POST /api/haircare endpoint
 */
export class HaircareProfileDto {
  @IsString()
  hairColor: string;

  @IsArray()
  @IsString({ each: true })
  hairConcerns: string[];

  @IsArray()
  @IsString({ each: true })
  services: string[];

  @IsBoolean()
  recentChange: boolean;

  @IsString()
  salonFrequency: string;

  @IsArray()
  @IsString({ each: true })
  homeRoutine: string[];

  @IsArray()
  @IsString({ each: true })
  stylingRoutine: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allergies?: string[];

  @IsOptional()
  @IsString()
  extraInfo?: string;
}
