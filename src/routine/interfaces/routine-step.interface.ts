import { ShopifyProduct } from '../../catalog/interfaces/shopify-product.interface';

export interface RoutineStep {
  step: string;
  description: string;
  products: ShopifyProduct[];
}

export interface RoutineResponse {
  message: string;
  routine: RoutineStep[];
}