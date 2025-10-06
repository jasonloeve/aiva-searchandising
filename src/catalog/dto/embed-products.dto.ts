// export class EmbedProductsResponseDto {
//   message: string;
//   productsProcessed: number;
//   errors?: string[];
// }

import { IsArray, IsNumber, IsOptional, IsString } from 'class-validator';

export class EmbedProductsResponseDto {
  @IsString()
  message: string;

  @IsNumber()
  productsProcessed: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  errors?: string[];
}
