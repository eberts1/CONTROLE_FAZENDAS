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
@Module({ imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, AuthModule, UsersModule, FarmsModule, AreasModule, ProcessesModule, ProcessRecordsModule, AnimalsModule, GeneticLotsModule, AbczModule, KinshipModule] })
export class AppModule {}
