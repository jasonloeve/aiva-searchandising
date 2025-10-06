
import { Module } from '@nestjs/common';
import { RoutineController } from './routine.controller';
import { RoutineService } from './routine.service';
import { CatalogModule } from '../catalog/catalog.module';

@Module({
  imports: [CatalogModule], // <-- import the module that exports CatalogService
  controllers: [RoutineController],
  providers: [RoutineService],
})
export class RoutineModule {}
// // src/routine/routine.module.ts
// import { Module } from '@nestjs/common';
// import { RoutineController } from './routine.controller';
// import { RoutineService } from './routine.service';
// import { PrismaModule } from '../../prisma/prisma.module'; // import PrismaModule

// @Module({
//   imports: [PrismaModule],
//   controllers: [RoutineController],
//   providers: [RoutineService],
// })
// export class RoutineModule {}

// import { Module } from '@nestjs/common';
// import { RoutineController } from './routine.controller';
// import { RoutineService } from './routine.service';
// import { CatalogModule } from '../catalog/catalog.module';

// @Module({
//   imports: [CatalogModule],
//   controllers: [RoutineController],
//   providers: [RoutineService],
// })
// export class RoutineModule {}

// import { Module } from '@nestjs/common';
// import { RoutineController } from './routine.controller';
// import { RoutineService } from './routine.service';

// @Module({
//   controllers: [RoutineController],
//   providers: [RoutineService],
// })
// export class RoutineModule {}
