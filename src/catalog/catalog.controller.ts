import {
  Controller,
  Post,
  Get,
  Query,
  Param,
  UseGuards,
  BadRequestException,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CatalogService } from './catalog.service';
import { EmbedProductsResponseDto } from './dto/embed-products.dto';
import { ApiKeyGuard } from '../common/guards/api-key.guard';

@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Post('embed-products')
  @UseGuards(ApiKeyGuard)
  @Throttle({ default: { limit: 1, ttl: 3600000 } }) // 1 request per hour (very expensive)
  async embedProducts(): Promise<EmbedProductsResponseDto> {
    return this.catalogService.embedAndStoreProducts();
  }

  @Get('products/shopify')
  async getShopifyProducts() {
    return this.catalogService.fetchProductsFromShopify();
  }

  @Get('publications/shopify')
  async getShopifyPublications() {
    return this.catalogService.fetchShopifyPublications();
  }

  @Get('products/category/:category')
  async getProductsByCategory(@Param('category') category: string) {
    if (!category || category.trim().length === 0) {
      throw new BadRequestException('Category parameter is required');
    }
    return this.catalogService.getProductsByCategory(category.trim());
  }

  @Get('products/search')
  async searchProducts(
    @Query('q') query: string,
    @Query('limit', new DefaultValuePipe(10), new ParseIntPipe({ optional: true }))
    limit?: number,
  ) {
    if (!query || query.trim().length === 0) {
      throw new BadRequestException('Query parameter "q" is required');
    }

    if (limit && (limit < 1 || limit > 100)) {
      throw new BadRequestException('Limit must be between 1 and 100');
    }

    return this.catalogService.searchProductsBySimilarity(query.trim(), limit ?? 10);
  }
}
