import { Product } from '../providers/e-commerce/e-commerce.interface';

export interface ProductWithSimilarity extends Product {
  similarity?: number;
}

export interface IProductRepository {
  /**
   * Find products by vector similarity search
   * @param embedding - The query embedding vector
   * @param limit - Maximum number of results
   * @returns Products with similarity scores
   */
  findBySimilarity(embedding: number[], limit: number): Promise<ProductWithSimilarity[]>;

  /**
   * Find products by their IDs
   * @param ids - Array of product IDs
   * @returns Matching products
   */
  findByIds(ids: string[]): Promise<Product[]>;

  /**
   * Find products by category
   * @param category - Category name
   * @returns Products in the category
   */
  findByCategory(category: string): Promise<Product[]>;

  /**
   * Upsert a product with embedding
   * @param product - Product data
   * @param embedding - Embedding vector
   */
  upsert(product: Product, embedding: number[]): Promise<void>;

  /**
   * Bulk upsert products with embeddings
   * @param products - Array of products with embeddings
   */
  bulkUpsert(products: Array<{ product: Product; embedding: number[] }>): Promise<number>;

  /**
   * Count total products in the database
   */
  count(): Promise<number>;
}
