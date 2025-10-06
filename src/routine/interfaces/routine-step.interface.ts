import { ShopifyProduct } from '../../catalog/interfaces/shopify-product.interface';

export interface RoutineStep {
  step: string;
  description: string; // Personalized text for this step
  products: ShopifyProduct[];
}

export interface RoutineResponse {
  message: string;
  routine: RoutineStep[];
}