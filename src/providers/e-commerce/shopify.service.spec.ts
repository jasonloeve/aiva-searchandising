import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of, throwError } from 'rxjs';
import { ShopifyService } from './shopify.service';
import { HttpException } from '@nestjs/common';
import { ShopifyException } from '../../common/exceptions/error-response.exception';

describe('ShopifyService', () => {
  let service: ShopifyService;
  let httpService: HttpService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'SHOPIFY_STORE_DOMAIN') return 'test-store.myshopify.com';
      if (key === 'SHOPIFY_API_VERSION') return '2024-01';
      if (key === 'SHOPIFY_ADMIN_TOKEN') return 'test-token';
      return null;
    }),
  };

  const mockHttpService = {
    post: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShopifyService,
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<ShopifyService>(ShopifyService);
    httpService = module.get<HttpService>(HttpService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should throw error when Shopify configuration is missing', () => {
    const invalidConfigService = {
      get: jest.fn(() => null),
    };

    expect(() => {
      new ShopifyService(httpService, invalidConfigService as any);
    }).toThrow('Missing required Shopify configuration');
  });

  describe('fetchProducts', () => {
    it('should fetch products successfully', async () => {
      const mockResponse = {
        data: {
          data: {
            products: {
              pageInfo: {
                hasNextPage: false,
                endCursor: 'cursor123',
              },
              nodes: [
                {
                  id: 'gid://shopify/Product/1',
                  title: 'Test Shampoo',
                  description: 'A great shampoo',
                  productType: 'Shampoo',
                  tags: ['sulfate-free', 'organic'],
                  images: {
                    edges: [{ node: { url: 'https://example.com/image.jpg' } }],
                  },
                  variants: {
                    edges: [{ node: { price: '29.99' } }],
                  },
                },
              ],
            },
          },
        },
      };

      mockHttpService.post.mockReturnValue(of(mockResponse));

      const result = await service.fetchProducts();

      expect(result.products).toHaveLength(1);
      expect(result.products[0].shopifyId).toBe('gid://shopify/Product/1');
      expect(result.products[0].title).toBe('Test Shampoo');
      expect(result.products[0].description).toBe('A great shampoo');
      expect(result.products[0].tags).toEqual(['sulfate-free', 'organic']);
      expect(result.products[0].category).toBe('Shampoo');
      expect(result.products[0].image).toBe('https://example.com/image.jpg');
      expect(result.products[0].price).toBe('29.99');
      expect(result.hasNextPage).toBe(false);
      expect(result.endCursor).toBe('cursor123');
    });

    it('should fetch products with custom limit', async () => {
      const mockResponse = {
        data: {
          data: {
            products: {
              pageInfo: { hasNextPage: true, endCursor: 'cursor456' },
              nodes: [],
            },
          },
        },
      };

      mockHttpService.post.mockReturnValue(of(mockResponse));

      await service.fetchProducts({ limit: 100 });

      expect(mockHttpService.post).toHaveBeenCalled();
      const callArgs = mockHttpService.post.mock.calls[0];
      expect(callArgs[1].query).toContain('first: 100');
    });

    it('should fetch products with cursor for pagination', async () => {
      const mockResponse = {
        data: {
          data: {
            products: {
              pageInfo: { hasNextPage: false, endCursor: 'newCursor' },
              nodes: [],
            },
          },
        },
      };

      mockHttpService.post.mockReturnValue(of(mockResponse));

      await service.fetchProducts({ cursor: 'existingCursor' });

      expect(mockHttpService.post).toHaveBeenCalled();
      const callArgs = mockHttpService.post.mock.calls[0];
      expect(callArgs[1].variables.cursor).toBe('existingCursor');
    });

    it('should fetch products with salesChannelId filter', async () => {
      const mockResponse = {
        data: {
          data: {
            products: {
              pageInfo: { hasNextPage: false, endCursor: '' },
              nodes: [],
            },
          },
        },
      };

      mockHttpService.post.mockReturnValue(of(mockResponse));

      await service.fetchProducts({ salesChannelId: 'channel123' });

      expect(mockHttpService.post).toHaveBeenCalled();
      const callArgs = mockHttpService.post.mock.calls[0];
      expect(callArgs[1].query).toContain('publication_ids:channel123');
    });

    it('should fetch products with status filter', async () => {
      const mockResponse = {
        data: {
          data: {
            products: {
              pageInfo: { hasNextPage: false, endCursor: '' },
              nodes: [],
            },
          },
        },
      };

      mockHttpService.post.mockReturnValue(of(mockResponse));

      await service.fetchProducts({ status: 'draft' });

      expect(mockHttpService.post).toHaveBeenCalled();
      const callArgs = mockHttpService.post.mock.calls[0];
      expect(callArgs[1].query).toContain('status:draft');
    });

    it('should handle products with missing optional fields', async () => {
      const mockResponse = {
        data: {
          data: {
            products: {
              pageInfo: { hasNextPage: false, endCursor: '' },
              nodes: [
                {
                  id: 'gid://shopify/Product/2',
                  title: 'Minimal Product',
                  description: '',
                  productType: '',
                  tags: [],
                },
              ],
            },
          },
        },
      };

      mockHttpService.post.mockReturnValue(of(mockResponse));

      const result = await service.fetchProducts();

      expect(result.products).toHaveLength(1);
      expect(result.products[0].shopifyId).toBe('gid://shopify/Product/2');
      expect(result.products[0].title).toBe('Minimal Product');
      expect(result.products[0].description).toBe('');
      expect(result.products[0].tags).toEqual([]);
      expect(result.products[0].category).toBeNull();
      expect(result.products[0].image).toBeNull();
      expect(result.products[0].price).toBeNull();
    });

    it('should throw HttpException when Shopify API fails', async () => {
      mockHttpService.post.mockReturnValue(
        throwError(() => new Error('Network error')),
      );

      await expect(service.fetchProducts()).rejects.toThrow(HttpException);
      await expect(service.fetchProducts()).rejects.toThrow(
        'Error fetching products from Shopify',
      );
    });

    it('should include correct headers in request', async () => {
      const mockResponse = {
        data: {
          data: {
            products: {
              pageInfo: { hasNextPage: false, endCursor: '' },
              nodes: [],
            },
          },
        },
      };

      mockHttpService.post.mockReturnValue(of(mockResponse));

      await service.fetchProducts();

      expect(mockHttpService.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        expect.objectContaining({
          headers: {
            'X-Shopify-Access-Token': 'test-token',
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }),
      );
    });
  });

  describe('fetchAllProducts', () => {
    it('should fetch all products with pagination', async () => {
      const mockResponse1 = {
        data: {
          data: {
            products: {
              pageInfo: { hasNextPage: true, endCursor: 'cursor1' },
              nodes: [
                {
                  id: 'gid://shopify/Product/1',
                  title: 'Product 1',
                  description: 'Description 1',
                  productType: 'Type1',
                  tags: ['tag1'],
                },
              ],
            },
          },
        },
      };

      const mockResponse2 = {
        data: {
          data: {
            products: {
              pageInfo: { hasNextPage: false, endCursor: 'cursor2' },
              nodes: [
                {
                  id: 'gid://shopify/Product/2',
                  title: 'Product 2',
                  description: 'Description 2',
                  productType: 'Type2',
                  tags: ['tag2'],
                },
              ],
            },
          },
        },
      };

      mockHttpService.post
        .mockReturnValueOnce(of(mockResponse1))
        .mockReturnValueOnce(of(mockResponse2));

      // Mock the delay to speed up test
      jest.spyOn<any, any>(service, 'delay').mockResolvedValue(undefined);

      const result = await service.fetchAllProducts(1000);

      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Product 1');
      expect(result[1].title).toBe('Product 2');
      expect(mockHttpService.post).toHaveBeenCalledTimes(2);
    });

    it('should respect maxProducts limit', async () => {
      const mockResponse = {
        data: {
          data: {
            products: {
              pageInfo: { hasNextPage: true, endCursor: 'cursor' },
              nodes: Array(250).fill({
                id: 'gid://shopify/Product/1',
                title: 'Product',
                description: 'Description',
                productType: 'Type',
                tags: [],
              }),
            },
          },
        },
      };

      mockHttpService.post.mockReturnValue(of(mockResponse));
      jest.spyOn<any, any>(service, 'delay').mockResolvedValue(undefined);

      const result = await service.fetchAllProducts(100);

      expect(result).toHaveLength(100);
    });

    it('should pass salesChannelId to fetchProducts', async () => {
      const mockResponse = {
        data: {
          data: {
            products: {
              pageInfo: { hasNextPage: false, endCursor: '' },
              nodes: [],
            },
          },
        },
      };

      mockHttpService.post.mockReturnValue(of(mockResponse));

      await service.fetchAllProducts(1000, 'channel123');

      expect(mockHttpService.post).toHaveBeenCalled();
      const callArgs = mockHttpService.post.mock.calls[0];
      expect(callArgs[1].query).toContain('publication_ids:channel123');
    });

    it('should stop when hasNextPage is false', async () => {
      const mockResponse = {
        data: {
          data: {
            products: {
              pageInfo: { hasNextPage: false, endCursor: '' },
              nodes: [
                {
                  id: 'gid://shopify/Product/1',
                  title: 'Product 1',
                  description: 'Description',
                  productType: 'Type',
                  tags: [],
                },
              ],
            },
          },
        },
      };

      mockHttpService.post.mockReturnValue(of(mockResponse));

      const result = await service.fetchAllProducts(1000);

      expect(result).toHaveLength(1);
      expect(mockHttpService.post).toHaveBeenCalledTimes(1);
    });
  });

  describe('getPublications', () => {
    it('should fetch publications successfully', async () => {
      const mockResponse = {
        data: {
          data: {
            publications: {
              nodes: [
                { id: 'gid://shopify/Publication/1', name: 'Online Store' },
                { id: 'gid://shopify/Publication/2', name: 'Point of Sale' },
              ],
            },
          },
        },
      };

      mockHttpService.post.mockReturnValue(of(mockResponse));

      const result = await service.getPublications();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('gid://shopify/Publication/1');
      expect(result[0].name).toBe('Online Store');
      expect(result[1].id).toBe('gid://shopify/Publication/2');
      expect(result[1].name).toBe('Point of Sale');
    });

    it('should throw ShopifyException when API fails', async () => {
      mockHttpService.post.mockReturnValue(
        throwError(() => new Error('Network error')),
      );

      await expect(service.getPublications()).rejects.toThrow(ShopifyException);
      await expect(service.getPublications()).rejects.toThrow(
        'Failed to fetch publications',
      );
    });

    it('should include correct headers in request', async () => {
      const mockResponse = {
        data: {
          data: {
            publications: {
              nodes: [],
            },
          },
        },
      };

      mockHttpService.post.mockReturnValue(of(mockResponse));

      await service.getPublications();

      expect(mockHttpService.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        expect.objectContaining({
          headers: {
            'X-Shopify-Access-Token': 'test-token',
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }),
      );
    });
  });
});
