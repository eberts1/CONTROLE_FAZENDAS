import { Module } from '@nestjs/common';
import { AnimalsModule } from '../animals/animals.module';
import { AdBannersController } from './ad-banners.controller';
import { AdBannersService } from './ad-banners.service';
import { HubLogoLoader } from './hub-logo.loader';
import { GeminiImageClient } from './providers/gemini-image.client';

@Module({
  imports: [AnimalsModule],
  controllers: [AdBannersController],
  providers: [AdBannersService, GeminiImageClient, HubLogoLoader],
})
export class AdBannersModule {}
