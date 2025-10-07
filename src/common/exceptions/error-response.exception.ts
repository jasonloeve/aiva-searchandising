import { HttpException, HttpStatus } from '@nestjs/common';

export class ErrorResponseException extends HttpException {
  constructor(message: string, originalError?: Error) {
    super(
      {
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        message: `OpenAI API Error: ${message}`,
        error: 'OpenAI Service Unavailable',
        ...(originalError && { details: originalError.message }),
      },
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }
}

export class ShopifyException extends HttpException {
  constructor(message: string, originalError?: Error) {
    super(
      {
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        message: `Shopify API Error: ${message}`,
        error: 'Shopify Service Unavailable',
        ...(originalError && { details: originalError.message }),
      },
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }
}

export class ProductNotFoundException extends HttpException {
  constructor(productId?: string) {
    super(
      {
        statusCode: HttpStatus.NOT_FOUND,
        message: productId
          ? `Product with ID ${productId} not found`
          : 'Products not found',
        error: 'Product Not Found',
      },
      HttpStatus.NOT_FOUND,
    );
  }
}
