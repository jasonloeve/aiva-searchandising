import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import OpenAI from 'openai';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ShopifyProductNode,
  ShopifyProduct,
  ShopifyProductGraphQLResponse,
  EmbedProductsResponseDto,
  ShopifyPublicationGraphQLResponse,
  ShopifyPublication,
} from './interfaces/shopify-product.interface';
import { ErrorResponseException, ShopifyException, ProductNotFoundException } from '../common/exceptions/error-response.exception';

@Injectable()
export class CatalogService {
  private readonly logger = new Logger(CatalogService.name);
  private readonly openai: OpenAI;
  private readonly shopifyEndpoint: string;
  private readonly shopifyToken: string;
  private readonly shopifySalesChannelId: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });

    const shopifyDomain = this.configService.get<string>('SHOPIFY_STORE_DOMAIN');
    const shopifyApiVersion = this.configService.get<string>('SHOPIFY_API_VERSION');
    this.shopifyToken = this.configService.get<string>('SHOPIFY_ADMIN_TOKEN')!;
    this.shopifySalesChannelId = this.configService.get<string>('SHOPIFY_SALES_CHANNEL_ID')!;

    if (!shopifyDomain || !this.shopifyToken || !shopifyApiVersion) {
      throw new Error('Missing required Shopify configuration');
    }

    this.shopifyEndpoint = `https://${shopifyDomain}/admin/api/${shopifyApiVersion}/graphql.json`;
  }

  // /** Fetch all Shopify channel IDs (publications) */
  // Utility built out to get channel IDs for filtering products by sales channel in the fetchProductsFromShopify method.
  async fetchShopifyPublications(): Promise<ShopifyPublication[]> {
    this.logger.log('Fetching channel IDs (publications) from Shopify...');

    const query = `
      query getPublications {
        publications(first: 100) {
          nodes {
            id
            name
          }
        }
      }
    `;

    try {
      const response = await firstValueFrom(
        this.httpService.post<ShopifyPublicationGraphQLResponse>(
          this.shopifyEndpoint,
          { query },
          {
            headers: {
              'X-Shopify-Access-Token': this.shopifyToken,
              'Content-Type': 'application/json',
            },
            timeout: 30000,
          },
        ),
      );

      const publications = response.data.data.publications.nodes;

      const channels = publications.map((pub: any) => ({
        id: pub.id,
        name: pub.name,
      }));

      this.logger.log(
        `Fetched ${channels.length} channels from Shopify: ${channels
          .map((c) => `${c.name} (${c.id})`)
          .join(', ')}`,
      );

      return channels;
    } catch (error) {
      this.logger.error('Error fetching Shopify publications', error.stack);
      throw new ShopifyException('Failed to fetch publications', error);
    }
  }

  /** Fetch all Shopify products (paginated) */
  async fetchProductsFromShopify(): Promise<ShopifyProduct[]> {
    const allProducts: ShopifyProduct[] = [];
    let hasNextPage = true;
    let endCursor: string | null = null;
    const MAX_PRODUCTS = 8000; // Dev limit

    this.logger.log('Fetching products from Shopify...');

    while (hasNextPage && allProducts.length < MAX_PRODUCTS) {
      const query = `
        query getProducts($cursor: String) {
          products(
            first: 250,
            query: "publication_ids:${this.shopifySalesChannelId} AND status:active",
            after: $cursor
          ) {
            pageInfo { hasNextPage, endCursor }
            nodes {
              id
              title
              description
              productType
              tags
              images(first: 1) { edges { node { url } } }
              variants(first: 1) { edges { node { price } } }
            }
          }
        }
      `;

      try {
        const response = await firstValueFrom(
          this.httpService.post<ShopifyProductGraphQLResponse>(
            this.shopifyEndpoint,
            { query, variables: { cursor: endCursor } },
            {
              headers: {
                'X-Shopify-Access-Token': this.shopifyToken,
                'Content-Type': 'application/json',
              },
              timeout: 30000,
            },
          ),
        );

        const pageData = response.data.data.products;
        allProducts.push(...this.transformShopifyProducts(pageData.nodes));

        hasNextPage = pageData.pageInfo.hasNextPage;
        endCursor = pageData.pageInfo.endCursor;

        if (allProducts.length >= MAX_PRODUCTS) break;
        if (hasNextPage) await this.delay(1000);
      } catch (error) {
        this.logger.error('Error fetching Shopify products', error.stack);
        throw new HttpException(
          'Error fetching products from Shopify',
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }
    }

    this.logger.log(`Fetched ${allProducts.length} products from Shopify`);
    return allProducts.slice(0, MAX_PRODUCTS);
  }

  private transformShopifyProducts(nodes: ShopifyProductNode[]): ShopifyProduct[] {
    return nodes.map((node) => ({
      shopifyId: node.id,
      title: node.title || '',
      description: node.description || '',
      tags: Array.isArray(node.tags) ? node.tags : [],
      category: node.productType || '',
      image: node.images?.edges?.[0]?.node?.url || null,
      price: node.variants?.edges?.[0]?.node?.price || null,
    }));
  }

  /** Main embedding & storage function (batch processing) */
  async embedAndStoreProducts(): Promise<EmbedProductsResponseDto> {
    const start = Date.now(); // ⏱️ start timer

    const products = await this.fetchProductsFromShopify();

    if (!products.length) {
      return { message: 'No products found to embed', productsProcessed: 0 };
    }

    this.logger.log(`Embedding & storing ${products.length} products...`);
    const batchSize = 20;
    const errors: string[] = [];
    let successCount = 0;

    for (let i = 0; i < products.length; i += batchSize) {
      const batchStart = Date.now(); // per-batch timer
      const batch = products.slice(i, i + batchSize);
      const texts = batch.map((p) => this.createEmbeddingText(p));

      let embeddingsResponse;
      try {
        embeddingsResponse = await this.openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: texts,
        });
      } catch (err) {
        this.logger.error('OpenAI embedding error', err.stack);
        // retry current batch once
        await this.delay(2000);
        i -= batchSize;
        continue;
      }

      for (let j = 0; j < batch.length; j++) {
        const product = batch[j];
        const embedding = embeddingsResponse.data[j]?.embedding;

        if (!embedding || !Array.isArray(embedding)) {
          errors.push(`Invalid embedding for product ${product.title}`);
          this.logger.error(`Invalid embedding for product ${product.title}`);
          continue;
        }

        try {

          const now = new Date();

          await this.prisma.$executeRaw`
            INSERT INTO "Product" 
              ("shopifyId", title, description, tags, category, image, price, embedding, "createdAt", "updatedAt")
            VALUES
              (${product.shopifyId}, ${product.title}, ${product.description}, ${product.tags}, ${product.category ?? ''}, ${product.image ?? ''}, ${product.price ?? ''}, ${embedding}::vector, ${now}, ${now})
            ON CONFLICT ("shopifyId") DO UPDATE
            SET title = EXCLUDED.title,
                description = EXCLUDED.description,
                tags = EXCLUDED.tags,
                category = COALESCE(EXCLUDED.category, ${product.category ?? ''}),
                image = COALESCE(EXCLUDED.image, ${product.image ?? ''}),
                price = COALESCE(EXCLUDED.price, ${product.price ?? ''}),
                embedding = EXCLUDED.embedding,
                "updatedAt" = ${now},
                "createdAt" = ${now};
          `;
          
          successCount++;
        } catch (dbError) {
          errors.push(`DB error for product ${product.title}: ${dbError.message}`);
          this.logger.error(`DB error for product ${product.title}`, dbError.stack);
        }
      }

      const batchEnd = Date.now();
      this.logger.log(
        `✅ Processed batch ${i / batchSize + 1} in ${(batchEnd - batchStart) / 1000}s`
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
  private createEmbeddingText(product: ShopifyProduct): string {
    const parts = [
      product.title,
      product.description,
      product.category,
      product.tags.join(' '),
    ].filter((part) => part && part.trim());

    return parts.join(' ').substring(0, 8000);
  }

  private delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /** Get products by category */
  async getProductsByCategory(category: string): Promise<ShopifyProduct[]> {
    const products = await this.prisma.product.findMany({
      where: { category: { equals: category, mode: 'insensitive' } },
      select: { shopifyId: true, title: true, description: true, tags: true, category: true, image: true, price: true },
    });

    // Ensure category is string (not null)
    return products.map((p) => ({
      ...p,
      category: p.category ?? '',
    }));
  }

  /** Search products by similarity using OpenAI embedding */
  async searchProductsBySimilarity(query: string, limit: number = 10): Promise<any[]> {
    try {
      const embeddingResponse = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: query,
      });
      const queryEmbedding = embeddingResponse.data[0].embedding;

      // Use $queryRaw with tagged template for safe parameterization
      const products = await this.prisma.$queryRaw<any[]>`
        SELECT
          "shopifyId",
          title,
          description,
          tags,
          category,
          image,
          price,
          1 - (embedding <=> ${queryEmbedding}::vector) AS similarity
        FROM "Product"
        ORDER BY embedding <=> ${queryEmbedding}::vector
        LIMIT ${limit}::BIGINT
      `;

      return products;
    } catch (error) {
      this.logger.error('Failed to search products by similarity', error.stack);

      // Check if it's an OpenAI error
      if (error.message?.includes('OpenAI') || error.name === 'APIError') {
        throw new ErrorResponseException('Failed to generate embedding for search', error);
      }

      throw new HttpException(
        'Failed to search products',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getProductsByIds(ids: string[]): Promise<ShopifyProduct[]> {
    try {
      if (!ids || ids.length === 0) {
        this.logger.warn('getProductsByIds called with empty array');
        return [];
      }

      const products = await this.prisma.product.findMany({
        where: {
          shopifyId: { in: ids },
        },
      });

      if (products.length === 0) {
        this.logger.warn(`No products found for IDs: ${ids.join(', ')}`);
      }

      return products;
    } catch (error) {
      this.logger.error(`Failed to fetch products by IDs`, error.stack);
      throw new HttpException(
        'Failed to fetch products',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
