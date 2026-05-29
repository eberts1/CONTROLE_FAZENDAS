import { Allow, IsArray, IsBoolean, IsEmail, IsIn, IsInt, IsNumber, IsObject, IsOptional, IsString, Max, Min, MinLength, ValidateNested } from 'class-validator';
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

export class RegisterDto {
  @ApiProperty({ example: 'João Silva' })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty({ example: 'joao@email.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'senha123' })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiProperty({ example: 'senha123' })
  @IsString()
  @MinLength(6)
  confirmPassword!: string;

  @ApiProperty({ example: 'Fazenda Boa Vista' })
  @IsString()
  @MinLength(2)
  farmName!: string;

  @ApiPropertyOptional({ example: 'Goiás, Brasil' })
  @IsOptional()
  @IsString()
  farmLocation?: string;
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

export class AdminCreateUserDto extends CreateUserDto {
  @ApiPropertyOptional({ enum: ['MANAGER', 'OPERATOR'] })
  @IsOptional()
  @IsIn(['MANAGER', 'OPERATOR'])
  role?: 'MANAGER' | 'OPERATOR';
}

export class BlockUserDto {
  @ApiProperty()
  @IsBoolean()
  blocked!: boolean;
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

  @ApiPropertyOptional({ description: 'Pelagem do animal' })
  @IsOptional()
  @IsString()
  pelagem?: string;

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
  @IsOptional()
  @IsString()
  @MinLength(1)
  tag?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  breed?: string;

  @ApiPropertyOptional({ description: 'Pelagem do animal' })
  @IsOptional()
  @IsString()
  pelagem?: string;

  @ApiPropertyOptional({ enum: ['MACHO', 'FEMEA'] })
  @IsOptional()
  @IsString()
  sex?: string;

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
      'Perfil ABCZ já consultado (genealogia, avaliação) — persistido no banco local',
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

export class CreatePartnerDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  document?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone2?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone3?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  zipCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ranchName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ranchCity?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ranchState?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ranchRegistration?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdatePartnerDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  document?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone2?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone3?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  zipCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ranchName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ranchCity?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ranchState?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ranchRegistration?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class OwnershipShareDto {
  @ApiProperty()
  @IsString()
  partnerId!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  @Max(100)
  ownershipPercent!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class ReplaceAnimalOwnershipDto {
  @ApiProperty({ type: [OwnershipShareDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OwnershipShareDto)
  shares!: OwnershipShareDto[];
}

export class SaleAllocationOverrideDto {
  @ApiProperty()
  @IsString()
  partnerId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  discountPercent?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  discountPercent2?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  entryAmount?: number;
}

export class CreateFarmEventDto {
  @ApiProperty({ enum: ['LEILAO', 'VENDA_EXTERNA', 'VENDA_FAZENDA', 'OUTRO'] })
  @IsString()
  type!: string;

  @ApiPropertyOptional({ enum: ['PLANEJADO', 'EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO'] })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  organizer?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  commissionPercent?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateFarmEventDto {
  @ApiPropertyOptional({ enum: ['LEILAO', 'VENDA_EXTERNA', 'VENDA_FAZENDA', 'OUTRO'] })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ enum: ['PLANEJADO', 'EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO'] })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  organizer?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  commissionPercent?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateAnimalSaleDto {
  @ApiProperty({
    enum: [
      'ASPIRACAO',
      'VENDA_ANIMAL',
      'VENDA_SEMEN',
      'VENDA_EMBRIAO',
      'SERVICO_ACASALAMENTO',
      'OUTRO',
    ],
  })
  @IsString()
  type!: string;

  @ApiPropertyOptional({
    enum: ['PRODUTO_GENETICO', 'SERVICO_REPRODUTIVO', 'COTA_ANIMAL', 'ANIMAL_INTEIRO'],
  })
  @IsOptional()
  @IsString()
  assetScope?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  eventId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  @Max(100)
  quotaPercent?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  applyOwnershipTransfer?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  buyerPartnerId?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sellerPartnerIds?: string[];

  @ApiProperty()
  @IsString()
  @MinLength(1)
  description!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  totalAmount!: number;

  @ApiProperty()
  @IsString()
  transactionDate!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  commissionPercent?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  paymentCondition?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  unitValue?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  captures?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ type: [SaleAllocationOverrideDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaleAllocationOverrideDto)
  allocationOverrides?: SaleAllocationOverrideDto[];
}

export class CreateEventAnimalSaleDto extends CreateAnimalSaleDto {
  @ApiProperty()
  @IsString()
  animalId!: string;
}

export class UpdateAnimalSaleDto {
  @ApiPropertyOptional({
    enum: [
      'ASPIRACAO',
      'VENDA_ANIMAL',
      'VENDA_SEMEN',
      'VENDA_EMBRIAO',
      'SERVICO_ACASALAMENTO',
      'OUTRO',
    ],
  })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({
    enum: ['PRODUTO_GENETICO', 'SERVICO_REPRODUTIVO', 'COTA_ANIMAL', 'ANIMAL_INTEIRO'],
  })
  @IsOptional()
  @IsString()
  assetScope?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  eventId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  @Max(100)
  quotaPercent?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  applyOwnershipTransfer?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  buyerPartnerId?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sellerPartnerIds?: string[];

  @ApiPropertyOptional()
  @IsString()
  @MinLength(1)
  description?: string;

  @ApiPropertyOptional()
  @Type(() => Number)
  totalAmount?: number;

  @ApiPropertyOptional()
  @IsString()
  transactionDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  commissionPercent?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  paymentCondition?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  unitValue?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  captures?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ type: [SaleAllocationOverrideDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaleAllocationOverrideDto)
  allocationOverrides?: SaleAllocationOverrideDto[];
}

export class CreateAnimalExpenseDto {
  @ApiProperty({ enum: ['VETERINARIO', 'ALIMENTACAO', 'MANEJO', 'REPRODUCAO', 'OUTRO'] })
  @IsString()
  type!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  eventId?: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  description!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  totalAmount!: number;

  @ApiProperty()
  @IsString()
  expenseDate!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  splitAmongPartners?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateAnimalExpenseDto {
  @ApiPropertyOptional({ enum: ['VETERINARIO', 'ALIMENTACAO', 'MANEJO', 'REPRODUCAO', 'OUTRO'] })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  eventId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  totalAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  expenseDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  splitAmongPartners?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateLedgerEntryDto {
  @ApiProperty()
  @IsString()
  section!: string;

  @ApiProperty({ enum: ['RECEITA', 'DESPESA'] })
  @IsString()
  type!: string;

  @ApiProperty()
  @IsString()
  category!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  scope?: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  description!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @ApiProperty()
  @IsString()
  entryDate!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dueDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  paidAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  eventId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  animalId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  areaId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  employeeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  partnerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateLedgerEntryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  section?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  scope?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  amount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  entryDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dueDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  paidAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  eventId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  animalId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  areaId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  employeeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  partnerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateRecurringTemplateDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  section?: string;

  @ApiProperty({ enum: ['RECEITA', 'DESPESA'] })
  @IsString()
  type!: string;

  @ApiProperty()
  @IsString()
  category!: string;

  @ApiProperty()
  @IsString()
  description!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  frequency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(28)
  dayOfMonth?: number;

  @ApiProperty()
  @IsString()
  startDate!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateRecurringTemplateDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  section?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  amount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  frequency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  dayOfMonth?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class GenerateRecurringDto {
  @ApiProperty({ example: '2026-05' })
  @IsString()
  referenceMonth!: string;
}

export class CreateEmployeeDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  document?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  role?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  baseSalary?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  admissionDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateEmployeeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  document?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  role?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  baseSalary?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  admissionDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreatePayrollRunDto {
  @ApiProperty({ example: '2026-05' })
  @IsString()
  referenceMonth!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

export class CreatePayrollLineDto {
  @ApiProperty()
  @IsString()
  employeeId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  grossAmount!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  deductions?: number;
}

export class CreateInstallmentRowDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sequence!: number;

  @ApiProperty()
  @IsString()
  label!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @ApiProperty()
  @IsString()
  dueDate!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  markAsPaid?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  paidAt?: string;
}

export class CreateSaleInstallmentPlanDto {
  @ApiProperty()
  @IsString()
  saleId!: string;

  @ApiProperty()
  @IsString()
  buyerPartnerId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  allocationId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  auctionLotNumber?: number;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  netAmount!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  bidValue?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [CreateInstallmentRowDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateInstallmentRowDto)
  installments!: CreateInstallmentRowDto[];
}

export class PayInstallmentDto {
  @ApiProperty()
  @IsString()
  paidAt!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  paidAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  paymentNotes?: string;
}

export class SaleMapImportInstallmentDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sequence!: number;

  @ApiProperty()
  @IsString()
  label!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @ApiProperty()
  @IsString()
  dueDate!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  markAsPaid?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  paidAt?: string;
}

export class SaleMapImportLotDto {
  @ApiProperty()
  @IsString()
  tempId!: string;

  @ApiProperty()
  @IsBoolean()
  selected!: boolean;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  canal!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  registration?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  animalId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  createAnimal?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  buyerName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  buyerPartnerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  createBuyer?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  bidValue?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  captures?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  totalAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  netAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  discountAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  entryAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isCashPayment?: boolean;

  @ApiPropertyOptional({ type: [SaleMapImportInstallmentDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaleMapImportInstallmentDto)
  installments?: SaleMapImportInstallmentDto[];
}

export class ImportSaleMapDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  transactionDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pdfPassword?: string;

  @ApiProperty({ type: [SaleMapImportLotDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaleMapImportLotDto)
  lots!: SaleMapImportLotDto[];
}

class PartnerImportParsedDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  document?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  email?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone2?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone3?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  state?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  zipCode?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ranchName?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ranchCity?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ranchState?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ranchRegistration?: string | null;
}

class PartnerImportRowDto {
  @ApiProperty()
  @IsString()
  tempId!: string;

  @ApiProperty()
  @IsBoolean()
  selected!: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  matchedPartnerId?: string | null;

  @ApiProperty({ enum: ['create', 'skip', 'update'] })
  @IsIn(['create', 'skip', 'update'])
  action!: 'create' | 'skip' | 'update';

  @ApiProperty({ type: PartnerImportParsedDto })
  @ValidateNested()
  @Type(() => PartnerImportParsedDto)
  parsed!: PartnerImportParsedDto;
}

export class ImportPartnerBuyersDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pdfPassword?: string;

  @ApiProperty({ type: [PartnerImportRowDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PartnerImportRowDto)
  rows!: PartnerImportRowDto[];
}

export class MergePartnersDto {
  @ApiProperty()
  @IsString()
  keepPartnerId!: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  mergePartnerIds!: string[];
}
