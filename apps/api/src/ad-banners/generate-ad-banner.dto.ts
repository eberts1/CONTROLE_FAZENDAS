import { AdBannerAspectRatio, AdBannerContentType } from '@controle-fazendas/shared';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class GenerateAdBannerDto {
  @ApiProperty({ enum: AdBannerContentType })
  @IsIn(Object.values(AdBannerContentType))
  contentType!: AdBannerContentType;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  damAnimalId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  sireAnimalId?: string;

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  subtitle?: string;

  @ApiPropertyOptional({ enum: AdBannerAspectRatio })
  @IsOptional()
  @IsIn(Object.values(AdBannerAspectRatio))
  aspectRatio?: AdBannerAspectRatio;
}
