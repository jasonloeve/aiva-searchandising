export interface Product {
  shopifyId: string;
  title: string;
  description: string;
  tags: string[];
  category: string | null;
  image: string | null;
  price: string | null;
}

export interface Publication {
  id: string;
  name: string;
}

export interface FetchProductsConfig {
  limit?: number;
  cursor?: string;
  salesChannelId?: string;
  status?: 'active' | 'archived' | 'draft';
}

export interface ProductsResponse {
  products: Product[];
  hasNextPage: boolean;
  endCursor: string | null;
}

export interface IECommerceProvider {
  /**
   * Fetch products from the e-commerce platform
   * @param config - Configuration for fetching products
   * @returns Products and pagination info
   */
  fetchProducts(config?: FetchProductsConfig): Promise<ProductsResponse>;

  /**
   * Fetch all products with automatic pagination
   * @param maxProducts - Maximum number of products to fetch
   * @param salesChannelId - Optional sales channel to filter by
   * @returns All products up to the limit
   */
  fetchAllProducts(maxProducts?: number, salesChannelId?: string): Promise<Product[]>;

  /**
   * Get available publications/sales channels
   * @returns List of publications
   */
  getPublications(): Promise<Publication[]>;
}
