import { Product } from '../../src/providers/e-commerce/e-commerce.interface';

/**
 * Factory for creating test products
 */
export class ProductFactory {
  private static counter = 0;

  /**
   * Create a single product with defaults
   */
  static createProduct(overrides?: Partial<Product>): Product {
    this.counter++;
    return {
      shopifyId: `gid://shopify/Product/${this.counter}`,
      title: `Test Product ${this.counter}`,
      description: `Description for test product ${this.counter}`,
      tags: ['test', 'product'],
      category: 'General',
      image: `https://example.com/image${this.counter}.jpg`,
      price: '29.99',
      ...overrides,
    };
  }

  /**
   * Create multiple products
   */
  static createProducts(count: number, overrides?: Partial<Product>): Product[] {
    return Array.from({ length: count }, () => this.createProduct(overrides));
  }

  /**
   * Create shampoo products
   */
  static createShampoos(count: number = 3): Product[] {
    return Array.from({ length: count }, (_, i) => ({
      shopifyId: `gid://shopify/Product/shampoo-${i + 1}`,
      title: `Hydrating Shampoo ${i + 1}`,
      description: 'Sulfate-free shampoo for dry hair',
      tags: ['shampoo', 'sulfate-free', 'hydrating'],
      category: 'Shampoo',
      image: `https://example.com/shampoo${i + 1}.jpg`,
      price: `${25 + i * 5}.99`,
    }));
  }

  /**
   * Create conditioner products
   */
  static createConditioners(count: number = 3): Product[] {
    return Array.from({ length: count }, (_, i) => ({
      shopifyId: `gid://shopify/Product/conditioner-${i + 1}`,
      title: `Deep Conditioner ${i + 1}`,
      description: 'Rich conditioning treatment',
      tags: ['conditioner', 'deep-conditioning', 'hydrating'],
      category: 'Conditioner',
      image: `https://example.com/conditioner${i + 1}.jpg`,
      price: `${30 + i * 5}.99`,
    }));
  }

  /**
   * Create treatment/styling products
   */
  static createTreatments(count: number = 4): Product[] {
    return Array.from({ length: count }, (_, i) => ({
      shopifyId: `gid://shopify/Product/treatment-${i + 1}`,
      title: `Hair Treatment ${i + 1}`,
      description: 'Repair and styling treatment',
      tags: ['treatment', 'styling', 'repair'],
      category: 'Treatment',
      image: `https://example.com/treatment${i + 1}.jpg`,
      price: `${35 + i * 5}.99`,
    }));
  }

  /**
   * Create complete haircare product set
   */
  static createHaircareSet(): Product[] {
    return [
      ...this.createShampoos(3),
      ...this.createConditioners(3),
      ...this.createTreatments(4),
    ];
  }

  /**
   * Create products with similarity scores
   */
  static createProductsWithSimilarity(count: number = 10): Array<Product & { similarity: number }> {
    return Array.from({ length: count }, (_, i) => ({
      ...this.createProduct(),
      similarity: 0.95 - (i * 0.05), // Descending similarity
    }));
  }

  /**
   * Reset counter for predictable tests
   */
  static resetCounter(): void {
    this.counter = 0;
  }
}
