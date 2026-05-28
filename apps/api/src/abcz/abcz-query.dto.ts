import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import { AnimalSex } from '@controle-fazendas/shared';

export class AbczLookupQueryDto {
  @ApiProperty({ enum: ['serie', 'rgd'] })
  @IsIn(['serie', 'rgd'])
  mode!: 'serie' | 'rgd';

  @ApiPropertyOptional({ example: 'GSCA' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  serie?: string;

  @ApiPropertyOptional({ example: '1000' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  rgn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  rgnFinal?: string;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  breedId?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  categoryId?: number;

  @ApiPropertyOptional({ enum: ['M', 'F'] })
  @IsOptional()
  @IsIn(['M', 'F'])
  sex?: 'M' | 'F';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  rgd?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  rgdFinal?: string;
}

export class AbczPreviewQueryDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  abczAnimalId!: string;

  @ApiProperty({ example: 'CSCF' })
  @IsString()
  @MinLength(1)
  serie!: string;

  @ApiProperty({ example: '1927' })
  @IsString()
  @MinLength(1)
  rgn!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  rgd!: string;

  @ApiProperty({ example: 5 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  breedCode!: number;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  categoryCode!: number;

  @ApiProperty({ enum: AnimalSex })
  @IsIn(Object.values(AnimalSex))
  sex!: AnimalSex;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  ownerId!: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  allowsDetail?: boolean;
}
