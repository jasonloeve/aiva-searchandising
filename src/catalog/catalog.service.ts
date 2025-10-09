import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { IEmbeddingProvider } from '../providers/embedding/embedding.interface';
import type { IECommerceProvider } from '../providers/e-commerce/e-commerce.interface';
import { Product } from '../providers/e-commerce/e-commerce.interface';
import type { IProductRepository } from '../repositories/product.repository.interface';
import { EmbedProductsResponseDto } from './dto/embed-products.dto';
import { ShopifyPublication } from './interfaces/shopify-product.interface';

@Injectable()
export class CatalogService {
  private readonly logger = new Logger(CatalogService.name);
  private readonly shopifySalesChannelId: string;

  constructor(
    @Inject('IEmbeddingProvider')
    private readonly embeddingProvider: IEmbeddingProvider,
    @Inject('IECommerceProvider')
    private readonly ecommerceProvider: IECommerceProvider,
    @Inject('IProductRepository')
    private readonly productRepository: IProductRepository,
    private readonly configService: ConfigService,
  ) {
    this.shopifySalesChannelId = this.configService.get<string>('SHOPIFY_SALES_CHANNEL_ID')!;
  }

  /** Fetch all Shopify channel IDs (publications) */
  async fetchShopifyPublications(): Promise<ShopifyPublication[]> {
    const publications = await this.ecommerceProvider.getPublications();
    return publications.map((pub) => ({ id: pub.id, name: pub.name }));
  }

  /** Fetch all Shopify products (paginated) */
  async fetchProductsFromShopify(): Promise<Product[]> {
    return this.ecommerceProvider.fetchAllProducts(8000, this.shopifySalesChannelId);
  }

  /** Main embedding & storage function (batch processing) */
  async embedAndStoreProducts(): Promise<EmbedProductsResponseDto> {
    const start = Date.now();

    const products = await this.fetchProductsFromShopify();

    if (!products.length) {
      return { message: 'No products found to embed', productsProcessed: 0 };
    }

    this.logger.log(`Embedding & storing ${products.length} products...`);
    const batchSize = 20;
    const errors: string[] = [];
    let successCount = 0;

    for (let i = 0; i < products.length; i += batchSize) {
      const batchStart = Date.now();
      const batch = products.slice(i, i + batchSize);
      const texts = batch.map((p) => this.createEmbeddingText(p));

      let embeddings: number[][];
      try {
        embeddings = await this.embeddingProvider.generateEmbeddings(texts);
      } catch (err) {
        this.logger.error('OpenAI embedding error', err.stack);
        // Retry current batch once
        await this.delay(2000);
        i -= batchSize;
        continue;
      }

      for (let j = 0; j < batch.length; j++) {
        const product = batch[j];
        const embedding = embeddings[j];

        if (!embedding || !Array.isArray(embedding)) {
          errors.push(`Invalid embedding for product ${product.title}`);
          this.logger.error(`Invalid embedding for product ${product.title}`);
          continue;
        }

        try {
          await this.productRepository.upsert(product, embedding);
          successCount++;
        } catch (dbError) {
          errors.push(`DB error for product ${product.title}: ${dbError.message}`);
          this.logger.error(`DB error for product ${product.title}`, dbError.stack);
        }
      }

      const batchEnd = Date.now();
      this.logger.log(
        `✅ Processed batch ${i / batchSize + 1} in ${(batchEnd - batchStart) / 1000}s`,
      );

      if (i + batchSize < products.length) await this.delay(1000);
    }

    const end = Date.now();
    const totalTime = ((end - start) / 1000).toFixed(2);

    const result: EmbedProductsResponseDto = {
      message: `Successfully embedded ${successCount} out of ${products.length} products in ${totalTime}s`,
      productsProcessed: successCount,
      errors: errors.length ? errors : undefined,
    };

    this.logger.log(result.message);
    return result;
  }

  /** Generate embedding text from product */
  private createEmbeddingText(product: Product): string {
    const parts = [
      product.title,
      product.description,
      product.category,
      product.tags.join(' '),
    ].filter((part) => part && part.trim());

    return parts.join(' ').substring(0, 8000);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /** Get products by category */
  async getProductsByCategory(category: string): Promise<Product[]> {
    return this.productRepository.findByCategory(category);
  }

  /** Search products by similarity using embedding */
  async searchProductsBySimilarity(query: string, limit: number = 10): Promise<any[]> {
    const queryEmbedding = await this.embeddingProvider.generateEmbedding(query);
    return this.productRepository.findBySimilarity(queryEmbedding, limit);
  }

  async getProductsByIds(ids: string[]): Promise<Product[]> {
    return this.productRepository.findByIds(ids);
  }
}
