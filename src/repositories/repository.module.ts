import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ProductRepository } from './product.repository';

@Module({
  imports: [PrismaModule],
  providers: [
    {
      provide: 'IProductRepository',
      useClass: ProductRepository,
    },
  ],
  exports: ['IProductRepository'],
})
export class RepositoryModule {}
