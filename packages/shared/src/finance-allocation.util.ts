import type { OwnershipShareInput } from './schemas';

export interface SaleAllocationOverride {
  partnerId: string;
  discountPercent?: number;
  discountPercent2?: number;
  entryAmount?: number;
}

export interface SaleAllocationResult {
  partnerId: string;
  ownershipPercent: number;
  grossAmount: number;
  discountPercent: number | null;
  discountPercent2: number | null;
  discountAmount: number;
  netAmount: number;
  entryAmount: number | null;
}

export interface ExpenseAllocationResult {
  partnerId: string;
  ownershipPercent: number;
  allocatedAmount: number;
}

const PERCENT_TOLERANCE = 0.01;

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function validateOwnershipShares(shares: OwnershipShareInput[]): void {
  if (shares.length === 0) {
    throw new Error('Informe ao menos um proprietário');
  }

  const total = roundMoney(shares.reduce((sum, s) => sum + s.ownershipPercent, 0));
  if (Math.abs(total - 100) > PERCENT_TOLERANCE) {
    throw new Error(`A soma das cotas deve ser 100% (atual: ${total}%)`);
  }

  const primaryCount = shares.filter((s) => s.isPrimary).length;
  if (primaryCount !== 1) {
    throw new Error('Deve haver exatamente um titular');
  }
}

export function calculateSaleTotalFromFormula(
  quantity?: number,
  unitValue?: number,
  captures?: number,
): number | null {
  if (quantity == null || unitValue == null || captures == null) return null;
  return roundMoney(quantity * unitValue * captures);
}

export function calculateSaleAllocations(
  totalAmount: number,
  shares: OwnershipShareInput[],
  overrides: SaleAllocationOverride[] = [],
): SaleAllocationResult[] {
  validateOwnershipShares(shares);

  const overrideMap = new Map(overrides.map((o) => [o.partnerId, o]));

  return shares.map((share) => {
    const override = overrideMap.get(share.partnerId);
    const grossAmount = roundMoney((totalAmount * share.ownershipPercent) / 100);
    const discountPercent = override?.discountPercent ?? null;
    const discountPercent2 = override?.discountPercent2 ?? null;

    let discountAmount = 0;
    if (discountPercent != null) {
      discountAmount += roundMoney((grossAmount * discountPercent) / 100);
    }
    if (discountPercent2 != null) {
      discountAmount += roundMoney((grossAmount * discountPercent2) / 100);
    }
    discountAmount = roundMoney(discountAmount);

    const netAmount = roundMoney(grossAmount - discountAmount);
    const entryAmount =
      override?.entryAmount != null ? roundMoney(override.entryAmount) : netAmount;

    return {
      partnerId: share.partnerId,
      ownershipPercent: share.ownershipPercent,
      grossAmount,
      discountPercent,
      discountPercent2,
      discountAmount,
      netAmount,
      entryAmount,
    };
  });
}

export function calculateExpenseAllocations(
  totalAmount: number,
  shares: OwnershipShareInput[],
  splitAmongPartners: boolean,
): ExpenseAllocationResult[] {
  if (!splitAmongPartners) {
    const primary = shares.find((s) => s.isPrimary) ?? shares[0];
    if (!primary) {
      throw new Error('Nenhum titular definido para alocar a despesa');
    }
    return [
      {
        partnerId: primary.partnerId,
        ownershipPercent: 100,
        allocatedAmount: roundMoney(totalAmount),
      },
    ];
  }

  validateOwnershipShares(shares);

  return shares.map((share) => ({
    partnerId: share.partnerId,
    ownershipPercent: share.ownershipPercent,
    allocatedAmount: roundMoney((totalAmount * share.ownershipPercent) / 100),
  }));
}
