import { Product } from '../../../providers/e-commerce/e-commerce.interface';

/**
 * Single step in a haircare routine
 */
export interface HaircareStep {
  step: string;
  description: string;
  products: Product[];
}

/**
 * Response for haircare recommendation endpoint
 */
export interface HaircareResponse {
  message: string;
  routine: HaircareStep[];
}
