import { Injectable, Logger, HttpStatus, HttpException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import {
  IECommerceProvider,
  Product,
  Publication,
  FetchProductsConfig,
  ProductsResponse,
} from './e-commerce.interface';
import { ShopifyException } from '../../common/exceptions/error-response.exception';

interface ShopifyProductNode {
  id: string;
  title: string;
  description: string;
  productType: string;
  tags: string[];
  images?: { edges: Array<{ node: { url: string } }> };
  variants?: { edges: Array<{ node: { price: string } }> };
}

interface ShopifyProductGraphQLResponse {
  data: {
    products: {
      pageInfo: {
        hasNextPage: boolean;
        endCursor: string;
      };
      nodes: ShopifyProductNode[];
    };
  };
}

interface ShopifyPublicationGraphQLResponse {
  data: {
    publications: {
      nodes: Array<{ id: string; name: string }>;
    };
  };
}

@Injectable()
export class ShopifyService implements IECommerceProvider {
  private readonly logger = new Logger(ShopifyService.name);
  private readonly shopifyEndpoint: string;
  private readonly shopifyToken: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    const shopifyDomain = this.configService.get<string>('SHOPIFY_STORE_DOMAIN');
    const shopifyApiVersion = this.configService.get<string>('SHOPIFY_API_VERSION');
    this.shopifyToken = this.configService.get<string>('SHOPIFY_ADMIN_TOKEN')!;

    if (!shopifyDomain || !this.shopifyToken || !shopifyApiVersion) {
      throw new Error('Missing required Shopify configuration');
    }

    this.shopifyEndpoint = `https://${shopifyDomain}/admin/api/${shopifyApiVersion}/graphql.json`;
  }

  async fetchProducts(config?: FetchProductsConfig): Promise<ProductsResponse> {
    const { limit = 250, cursor, salesChannelId, status = 'active' } = config || {};

    const queryFilters: string[] = [];
    if (salesChannelId) {
      queryFilters.push(`publication_ids:${salesChannelId}`);
    }
    if (status) {
      queryFilters.push(`status:${status}`);
    }

    const query = `
      query getProducts($cursor: String) {
        products(
          first: ${limit},
          query: "${queryFilters.join(' AND ')}",
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
          { query, variables: { cursor } },
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

      return {
        products: this.transformShopifyProducts(pageData.nodes),
        hasNextPage: pageData.pageInfo.hasNextPage,
        endCursor: pageData.pageInfo.endCursor,
      };
    } catch (error) {
      this.logger.error('Error fetching Shopify products', error.stack);
      throw new HttpException(
        'Error fetching products from Shopify',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  async fetchAllProducts(maxProducts = 8000, salesChannelId?: string): Promise<Product[]> {
    const allProducts: Product[] = [];
    let hasNextPage = true;
    let endCursor: string | null = null;

    this.logger.log('Fetching all products from Shopify...');

    while (hasNextPage && allProducts.length < maxProducts) {
      const response = await this.fetchProducts({
        limit: 250,
        cursor: endCursor || undefined,
        salesChannelId,
        status: 'active',
      });

      allProducts.push(...response.products);
      hasNextPage = response.hasNextPage;
      endCursor = response.endCursor;

      if (allProducts.length >= maxProducts) break;
      if (hasNextPage) await this.delay(1000);
    }

    this.logger.log(`Fetched ${allProducts.length} products from Shopify`);
    return allProducts.slice(0, maxProducts);
  }

  async getPublications(): Promise<Publication[]> {
    this.logger.log('Fetching publications from Shopify...');

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

      this.logger.log(
        `Fetched ${publications.length} publications from Shopify: ${publications
          .map((p) => `${p.name} (${p.id})`)
          .join(', ')}`,
      );

      return publications;
    } catch (error) {
      this.logger.error('Error fetching Shopify publications', error.stack);
      throw new ShopifyException('Failed to fetch publications', error);
    }
  }

  private transformShopifyProducts(nodes: ShopifyProductNode[]): Product[] {
    return nodes.map((node) => ({
      shopifyId: node.id,
      title: node.title || '',
      description: node.description || '',
      tags: Array.isArray(node.tags) ? node.tags : [],
      category: node.productType || null,
      image: node.images?.edges?.[0]?.node?.url || null,
      price: node.variants?.edges?.[0]?.node?.price || null,
    }));
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
