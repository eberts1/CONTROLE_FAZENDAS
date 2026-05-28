import { Allow, IsEmail, IsInt, IsObject, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin@controlefazendas.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'admin123' })
  @IsString()
  @MinLength(6)
  password!: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  refreshToken!: string;
}

export class CreateUserDto {
  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  name!: string;
}

export class CreateFarmDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiPropertyOptional()
  @IsString()
  location?: string;
}

export class UpdateFarmDto {
  @ApiPropertyOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  location?: string;
}

export class CreateAreaDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty({ enum: ['PASTO', 'TALHAO', 'GALPAO', 'OUTRO'] })
  @IsString()
  type!: string;

  @ApiPropertyOptional()
  hectares?: number;

  @ApiPropertyOptional()
  @IsString()
  description?: string;
}

export class UpdateAreaDto {
  @ApiPropertyOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiPropertyOptional({ enum: ['PASTO', 'TALHAO', 'GALPAO', 'OUTRO'] })
  @IsString()
  type?: string;

  @ApiPropertyOptional()
  hectares?: number;

  @ApiPropertyOptional()
  @IsString()
  description?: string;
}

export class CreateProcessDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty({ enum: ['PLANTIO', 'COLHEITA', 'MANEJO', 'IRRIGACAO', 'OUTRO'] })
  @IsString()
  category!: string;

  @ApiPropertyOptional()
  @IsString()
  description?: string;
}

export class UpdateProcessDto {
  @ApiPropertyOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiPropertyOptional({ enum: ['PLANTIO', 'COLHEITA', 'MANEJO', 'IRRIGACAO', 'OUTRO'] })
  @IsString()
  category?: string;

  @ApiPropertyOptional()
  @IsString()
  description?: string;
}

export class CreateProcessRecordDto {
  @ApiProperty()
  @IsString()
  processId!: string;

  @ApiProperty()
  @IsString()
  areaId!: string;

  @ApiProperty()
  @IsString()
  performedAt!: string;

  @ApiPropertyOptional()
  @IsString()
  notes?: string;
}

export class UpdateProcessRecordDto {
  @ApiPropertyOptional()
  @IsString()
  processId?: string;

  @ApiPropertyOptional()
  @IsString()
  areaId?: string;

  @ApiPropertyOptional()
  @IsString()
  performedAt?: string;

  @ApiPropertyOptional()
  @IsString()
  notes?: string;
}

export class CreateAnimalDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  tag!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  breed?: string;

  @ApiProperty({ enum: ['MACHO', 'FEMEA'] })
  @IsString()
  sex!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  birthDate?: string;

  @ApiPropertyOptional({ enum: ['ATIVO', 'VENDIDO', 'MORTO', 'OUTRO'] })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  abczAnimalId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  abczSerie?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  abczRgn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  abczRgd?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  abczBreedCode?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  abczCategoryCode?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  abczSourceUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  abczOwnerId?: string;

  @ApiPropertyOptional({
    description:
      'Perfil ABCZ já consultado no cadastro (genealogia, avaliação) — persistido no banco local',
  })
  @Allow()
  @IsOptional()
  @IsObject()
  abczProfileSnapshot?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sireId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  damId?: string | null;
}

export class UpdateAnimalDto {
  @ApiPropertyOptional()
  @IsString()
  @MinLength(1)
  tag?: string;

  @ApiPropertyOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  breed?: string;

  @ApiPropertyOptional({ enum: ['MACHO', 'FEMEA'] })
  @IsString()
  sex?: string;

  @ApiPropertyOptional()
  @IsString()
  birthDate?: string;

  @ApiPropertyOptional({ enum: ['ATIVO', 'VENDIDO', 'MORTO', 'OUTRO'] })
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  abczAnimalId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  abczSerie?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  abczRgn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  abczRgd?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  abczBreedCode?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  abczCategoryCode?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  abczSourceUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  abczOwnerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sireId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  damId?: string | null;
}

export class CreateGeneticLotDto {
  @ApiProperty()
  @IsString()
  sourceAnimalId!: string;

  @ApiProperty({ enum: ['SEMEN', 'EMBRIAO'] })
  @IsString()
  materialType!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  lotCode!: string;

  @ApiPropertyOptional()
  @IsString()
  collectedAt?: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  initialDoses!: number;

  @ApiPropertyOptional()
  @IsString()
  storageTank?: string;

  @ApiPropertyOptional()
  @IsString()
  storageCanister?: string;

  @ApiPropertyOptional()
  @IsString()
  storagePosition?: string;

  @ApiPropertyOptional()
  @IsString()
  laboratory?: string;

  @ApiPropertyOptional()
  @IsString()
  expiresAt?: string;

  @ApiPropertyOptional()
  @IsString()
  notes?: string;
}

export class UpdateGeneticLotDto {
  @ApiPropertyOptional()
  @IsString()
  sourceAnimalId?: string;

  @ApiPropertyOptional({ enum: ['SEMEN', 'EMBRIAO'] })
  @IsString()
  materialType?: string;

  @ApiPropertyOptional()
  @IsString()
  @MinLength(1)
  lotCode?: string;

  @ApiPropertyOptional()
  @IsString()
  collectedAt?: string;

  @ApiPropertyOptional()
  @IsString()
  storageTank?: string;

  @ApiPropertyOptional()
  @IsString()
  storageCanister?: string;

  @ApiPropertyOptional()
  @IsString()
  storagePosition?: string;

  @ApiPropertyOptional()
  @IsString()
  laboratory?: string;

  @ApiPropertyOptional()
  @IsString()
  expiresAt?: string;

  @ApiPropertyOptional()
  @IsString()
  notes?: string;
}

export class CreateStockMovementDto {
  @ApiProperty({ enum: ['ENTRADA', 'SAIDA', 'AJUSTE'] })
  @IsString()
  type!: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiPropertyOptional()
  @IsString()
  reason?: string;

  @ApiProperty()
  @IsString()
  referenceDate!: string;
}
