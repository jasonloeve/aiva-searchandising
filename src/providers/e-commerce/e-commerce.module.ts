import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ShopifyService } from './shopify.service';

@Module({
  imports: [HttpModule],
  providers: [
    {
      provide: 'IECommerceProvider',
      useClass: ShopifyService,
    },
  ],
  exports: ['IECommerceProvider'],
})
export class ECommerceModule {}
