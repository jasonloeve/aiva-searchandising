import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { IProductRepository, ProductWithSimilarity } from './product.repository.interface';
import { Product } from '../providers/e-commerce/e-commerce.interface';

@Injectable()
export class ProductRepository implements IProductRepository {
  private readonly logger = new Logger(ProductRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async findBySimilarity(embedding: number[], limit: number): Promise<ProductWithSimilarity[]> {
    try {
      const products = await this.prisma.$queryRaw<any[]>`
        SELECT
          "shopifyId",
          title,
          description,
          tags,
          category,
          image,
          price,
          1 - (embedding <=> ${embedding}::vector) AS similarity
        FROM "Product"
        ORDER BY embedding <=> ${embedding}::vector
        LIMIT ${limit}::BIGINT
      `;

      return products.map((p) => ({
        shopifyId: p.shopifyId,
        title: p.title,
        description: p.description,
        tags: p.tags,
        category: p.category,
        image: p.image,
        price: p.price,
        similarity: parseFloat(p.similarity),
      }));
    } catch (error) {
      this.logger.error('Failed to search products by similarity', error.stack);
      throw new HttpException(
        'Failed to search products',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findByIds(ids: string[]): Promise<Product[]> {
    try {
      if (!ids || ids.length === 0) {
        this.logger.warn('findByIds called with empty array');
        return [];
      }

      const products = await this.prisma.product.findMany({
        where: {
          shopifyId: { in: ids },
        },
        select: {
          shopifyId: true,
          title: true,
          description: true,
          tags: true,
          category: true,
          image: true,
          price: true,
        },
      });

      if (products.length === 0) {
        this.logger.warn(`No products found for IDs: ${ids.join(', ')}`);
      }

      return products.map((p) => ({
        ...p,
        category: p.category || null,
        image: p.image || null,
        price: p.price || null,
      }));
    } catch (error) {
      this.logger.error('Failed to fetch products by IDs', error.stack);
      throw new HttpException(
        'Failed to fetch products',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findByCategory(category: string): Promise<Product[]> {
    try {
      const products = await this.prisma.product.findMany({
        where: { category: { equals: category, mode: 'insensitive' } },
        select: {
          shopifyId: true,
          title: true,
          description: true,
          tags: true,
          category: true,
          image: true,
          price: true,
        },
      });

      return products.map((p) => ({
        ...p,
        category: p.category || null,
        image: p.image || null,
        price: p.price || null,
      }));
    } catch (error) {
      this.logger.error(`Failed to fetch products by category: ${category}`, error.stack);
      throw new HttpException(
        'Failed to fetch products',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async upsert(product: Product, embedding: number[]): Promise<void> {
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
    } catch (error) {
      this.logger.error(`Failed to upsert product: ${product.title}`, error.stack);
      throw error;
    }
  }

  async bulkUpsert(products: Array<{ product: Product; embedding: number[] }>): Promise<number> {
    let successCount = 0;

    for (const { product, embedding } of products) {
      try {
        await this.upsert(product, embedding);
        successCount++;
      } catch (error) {
        this.logger.error(`Failed to upsert product ${product.title}`, error);
      }
    }

    return successCount;
  }

  async count(): Promise<number> {
    return this.prisma.product.count();
  }
}
