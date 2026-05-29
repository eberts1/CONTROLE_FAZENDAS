import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { FarmsModule } from './farms/farms.module';
import { AreasModule } from './areas/areas.module';
import { ProcessesModule } from './processes/processes.module';
import { ProcessRecordsModule } from './process-records/process-records.module';
import { AnimalsModule } from './animals/animals.module';
import { GeneticLotsModule } from './genetic-lots/genetic-lots.module';
import { AbczModule } from './abcz/abcz.module';
import { KinshipModule } from './kinship/kinship.module';
import { PartnersModule } from './partners/partners.module';
import { AnimalOwnershipModule } from './animal-ownership/animal-ownership.module';
import { AnimalFinancesModule } from './animal-finances/animal-finances.module';
import { AnimalManagementModule } from './animal-management/animal-management.module';
import { FarmEventsModule } from './farm-events/farm-events.module';
import { FarmFinancesModule } from './farm-finances/farm-finances.module';
import { SaleInstallmentsModule } from './sale-installments/sale-installments.module';
import { AdBannersModule } from './ad-banners/ad-banners.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    FarmsModule,
    AreasModule,
    ProcessesModule,
    ProcessRecordsModule,
    AnimalsModule,
    GeneticLotsModule,
    AbczModule,
    KinshipModule,
    PartnersModule,
    AnimalOwnershipModule,
    AnimalFinancesModule,
    AnimalManagementModule,
    FarmEventsModule,
    FarmFinancesModule,
    SaleInstallmentsModule,
    AdBannersModule,
  ],
})
export class AppModule {}
