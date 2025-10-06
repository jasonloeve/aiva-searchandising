// export interface ShopifyProductNode {
//   id: string;
//   title: string;
//   description: string;
//   productType: string;
//   tags: string[];
//   images: {
//     edges: Array<{
//       node: {
//         url: string;
//       };
//     }>;
//   };
//   variants: {
//     edges: Array<{
//       node: {
//         price: string;
//       };
//     }>;
//   };
// }

// export interface ShopifyGraphQLResponse {
//   products: {
//     nodes: ShopifyProductNode[];
//   };
// }

export interface ShopifyProductNode {
  id: string;
  title: string;
  description: string;
  productType: string;
  tags: string[];
  images: {
    edges: Array<{
      node: {
        url: string;
      };
    }>;
  };
  variants: {
    edges: Array<{
      node: {
        price: string;
      };
    }>;
  };
}

export interface ShopifyProductGraphQLResponse {
  data: {
    products: {
      nodes: ShopifyProductNode[];
      pageInfo: {
        endCursor: string | null;
        hasNextPage: boolean;
      };
    };
  };
}

export interface ShopifyPublicationNode {
  id: string;
  catalog: {
    edges: Array<{
      node: {
        id: string;
        title: string;
      };
    }>;
  }
}

export interface ShopifyPublicationGraphQLResponse {
  data: {
    publications: {
      nodes: ShopifyPublicationNode[];
    };
  };
}

export interface ShopifyPublication {
  id: string | null;
  name: string | null;
}

export interface ShopifyProduct {
  shopifyId: string;
  title: string;
  description: string;
  tags: string[];
  category: string | null;
  image: string | null;
  price: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface EmbedProductsResponseDto {
  message: string;
  productsProcessed: number;
  errors?: string[];
}
