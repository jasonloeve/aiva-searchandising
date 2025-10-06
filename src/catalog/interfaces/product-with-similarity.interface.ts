export interface ProductWithSimilarity {
  shopifyId: string;
  title: string;
  description: string;
  tags: string[];
  category: string | null;
  image: string | null;
  price: string | null;
  similarity: number;
}