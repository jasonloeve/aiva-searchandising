import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CatalogService } from './catalog.service';
import { CatalogController } from './catalog.controller';
import { EmbeddingModule } from '../providers/embedding/embedding.module';
import { ECommerceModule } from '../providers/e-commerce/e-commerce.module';
import { RepositoryModule } from '../repositories/repository.module';

@Module({
  imports: [
    ConfigModule,
    EmbeddingModule,
    ECommerceModule,
    RepositoryModule,
  ],
  controllers: [CatalogController],
  providers: [CatalogService],
  exports: [CatalogService],
})
export class CatalogModule {}
