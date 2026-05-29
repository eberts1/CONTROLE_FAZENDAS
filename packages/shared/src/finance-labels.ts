import { FinanceSection, LedgerCategory, LedgerEntryType } from './enums';

export const financeSectionLabels: Record<FinanceSection, string> = {
  [FinanceSection.COTIDIANO]: 'Cotidiano',
  [FinanceSection.FIXOS_RECORRENTES]: 'Fixos e recorrentes',
  [FinanceSection.OPERACIONAL]: 'Operacional',
  [FinanceSection.PESSOAL_FOLHA]: 'Pessoal e folha',
  [FinanceSection.PECUARIA_EVENTOS]: 'Pecuária e eventos',
  [FinanceSection.INVESTIMENTOS]: 'Investimentos',
  [FinanceSection.PARCEIROS]: 'Parceiros e cotas',
};

export const financeSectionDescriptions: Record<FinanceSection, string> = {
  [FinanceSection.COTIDIANO]:
    'Lançamentos do dia a dia: compras avulsas, pagamentos pontuais, recebimentos não recorrentes.',
  [FinanceSection.FIXOS_RECORRENTES]:
    'Contas fixas e compromissos de longo prazo: energia, arrendamento, financiamentos, assinaturas.',
  [FinanceSection.OPERACIONAL]:
    'Custo de operar a fazenda: insumos, combustível, manutenção, frete, processos e áreas.',
  [FinanceSection.PESSOAL_FOLHA]:
    'Funcionários, salários, encargos, adiantamentos e fechamento mensal da folha.',
  [FinanceSection.PECUARIA_EVENTOS]:
    'Receitas e despesas vindas de animais e eventos (leilões, vendas, genético).',
  [FinanceSection.INVESTIMENTOS]:
    'Bens de capital: máquinas, benfeitorias, melhorias de terra — visão de longo prazo.',
  [FinanceSection.PARCEIROS]:
    'Aportes, distribuições e movimentações entre sócios/parceiros da fazenda.',
};

export const ledgerEntryTypeLabels: Record<LedgerEntryType, string> = {
  [LedgerEntryType.RECEITA]: 'Receita',
  [LedgerEntryType.DESPESA]: 'Despesa',
};

export const ledgerCategoryLabels: Record<LedgerCategory, string> = {
  [LedgerCategory.VENDA_ANIMAL]: 'Venda de animal / cota',
  [LedgerCategory.VENDA_GENETICO]: 'Venda genética (sêmen, embrião)',
  [LedgerCategory.OUTRA_RECEITA]: 'Outra receita',
  [LedgerCategory.APORTE_PARCEIRO]: 'Aporte de parceiro',
  [LedgerCategory.COMPRA_INSUMO]: 'Compra de insumo',
  [LedgerCategory.COMBUSTIVEL]: 'Combustível',
  [LedgerCategory.MANUTENCAO]: 'Manutenção',
  [LedgerCategory.ALIMENTACAO]: 'Alimentação',
  [LedgerCategory.VETERINARIO]: 'Veterinário',
  [LedgerCategory.REPRODUCAO]: 'Reprodução',
  [LedgerCategory.DESLOCAMENTO]: 'Deslocamento / frete',
  [LedgerCategory.COMISSAO_LEILAO]: 'Comissão de leilão',
  [LedgerCategory.HOSPEDAGEM]: 'Hospedagem / diárias',
  [LedgerCategory.ENERGIA]: 'Energia elétrica',
  [LedgerCategory.AGUA]: 'Água',
  [LedgerCategory.TELEFONE_INTERNET]: 'Telefone / internet',
  [LedgerCategory.ARRENDAMENTO]: 'Arrendamento',
  [LedgerCategory.SEGURO]: 'Seguro',
  [LedgerCategory.FINANCIAMENTO]: 'Financiamento',
  [LedgerCategory.IMPOSTO_TAXA]: 'Imposto / taxa',
  [LedgerCategory.SALARIO]: 'Salário',
  [LedgerCategory.FERIAS_13]: 'Férias / 13º',
  [LedgerCategory.ENCARGOS]: 'Encargos trabalhistas',
  [LedgerCategory.ADIANTAMENTO]: 'Adiantamento',
  [LedgerCategory.BENEFICIO]: 'Benefício',
  [LedgerCategory.MAQUINA_EQUIPAMENTO]: 'Máquina / equipamento',
  [LedgerCategory.BENFEITORIA]: 'Benfeitoria',
  [LedgerCategory.TERRA_MELHORIA]: 'Melhoria de terra',
  [LedgerCategory.DISTRIBUICAO_PARCEIRO]: 'Distribuição a parceiro',
  [LedgerCategory.OUTRA_DESPESA]: 'Outra despesa',
};

/** Categorias sugeridas por seção (UX dos formulários). */
export const categoriesBySection: Record<FinanceSection, LedgerCategory[]> = {
  [FinanceSection.COTIDIANO]: [
    LedgerCategory.OUTRA_RECEITA,
    LedgerCategory.COMPRA_INSUMO,
    LedgerCategory.COMBUSTIVEL,
    LedgerCategory.MANUTENCAO,
    LedgerCategory.IMPOSTO_TAXA,
    LedgerCategory.OUTRA_DESPESA,
  ],
  [FinanceSection.FIXOS_RECORRENTES]: [
    LedgerCategory.ENERGIA,
    LedgerCategory.AGUA,
    LedgerCategory.TELEFONE_INTERNET,
    LedgerCategory.ARRENDAMENTO,
    LedgerCategory.SEGURO,
    LedgerCategory.FINANCIAMENTO,
    LedgerCategory.OUTRA_DESPESA,
  ],
  [FinanceSection.OPERACIONAL]: [
    LedgerCategory.COMPRA_INSUMO,
    LedgerCategory.COMBUSTIVEL,
    LedgerCategory.MANUTENCAO,
    LedgerCategory.ALIMENTACAO,
    LedgerCategory.VETERINARIO,
    LedgerCategory.REPRODUCAO,
    LedgerCategory.DESLOCAMENTO,
    LedgerCategory.COMISSAO_LEILAO,
    LedgerCategory.HOSPEDAGEM,
    LedgerCategory.OUTRA_DESPESA,
  ],
  [FinanceSection.PESSOAL_FOLHA]: [
    LedgerCategory.SALARIO,
    LedgerCategory.FERIAS_13,
    LedgerCategory.ENCARGOS,
    LedgerCategory.ADIANTAMENTO,
    LedgerCategory.BENEFICIO,
    LedgerCategory.OUTRA_DESPESA,
  ],
  [FinanceSection.PECUARIA_EVENTOS]: [
    LedgerCategory.VENDA_ANIMAL,
    LedgerCategory.VENDA_GENETICO,
    LedgerCategory.VETERINARIO,
    LedgerCategory.ALIMENTACAO,
    LedgerCategory.REPRODUCAO,
    LedgerCategory.DESLOCAMENTO,
    LedgerCategory.COMISSAO_LEILAO,
    LedgerCategory.HOSPEDAGEM,
    LedgerCategory.OUTRA_DESPESA,
  ],
  [FinanceSection.INVESTIMENTOS]: [
    LedgerCategory.MAQUINA_EQUIPAMENTO,
    LedgerCategory.BENFEITORIA,
    LedgerCategory.TERRA_MELHORIA,
    LedgerCategory.OUTRA_DESPESA,
  ],
  [FinanceSection.PARCEIROS]: [
    LedgerCategory.APORTE_PARCEIRO,
    LedgerCategory.DISTRIBUICAO_PARCEIRO,
    LedgerCategory.OUTRA_RECEITA,
    LedgerCategory.OUTRA_DESPESA,
  ],
};
