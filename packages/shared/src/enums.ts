export enum Role {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  OPERATOR = 'OPERATOR',
}

export enum FarmRole {
  OWNER = 'OWNER',
  MANAGER = 'MANAGER',
  MEMBER = 'MEMBER',
}

export enum AreaType {
  PASTO = 'PASTO',
  TALHAO = 'TALHAO',
  GALPAO = 'GALPAO',
  OUTRO = 'OUTRO',
}

export enum ProcessCategory {
  PLANTIO = 'PLANTIO',
  COLHEITA = 'COLHEITA',
  MANEJO = 'MANEJO',
  IRRIGACAO = 'IRRIGACAO',
  OUTRO = 'OUTRO',
}

export enum AnimalSex {
  MACHO = 'MACHO',
  FEMEA = 'FEMEA',
}

export enum AnimalStatus {
  ATIVO = 'ATIVO',
  VENDIDO = 'VENDIDO',
  MORTO = 'MORTO',
  OUTRO = 'OUTRO',
}

export enum GeneticMaterialType {
  SEMEN = 'SEMEN',
  EMBRIAO = 'EMBRIAO',
}

export enum StockMovementType {
  ENTRADA = 'ENTRADA',
  SAIDA = 'SAIDA',
  AJUSTE = 'AJUSTE',
}
