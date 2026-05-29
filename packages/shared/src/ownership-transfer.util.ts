import { AnimalSaleType, SaleAssetScope } from './enums';

export interface QuotaOwnershipShare {
  partnerId: string;
  ownershipPercent: number;
  isPrimary?: boolean;
}

function roundPercent(value: number): number {
  return Math.round(value * 100) / 100;
}

export function resolveAssetScope(
  type: AnimalSaleType,
  quotaPercent?: number | null,
  explicit?: SaleAssetScope | null,
): SaleAssetScope {
  if (explicit) return explicit;

  switch (type) {
    case AnimalSaleType.VENDA_SEMEN:
    case AnimalSaleType.VENDA_EMBRIAO:
    case AnimalSaleType.ASPIRACAO:
      return SaleAssetScope.PRODUTO_GENETICO;
    case AnimalSaleType.SERVICO_ACASALAMENTO:
      return SaleAssetScope.SERVICO_REPRODUTIVO;
    case AnimalSaleType.VENDA_ANIMAL:
      if (quotaPercent != null && quotaPercent < 100) {
        return SaleAssetScope.COTA_ANIMAL;
      }
      return SaleAssetScope.ANIMAL_INTEIRO;
    default:
      return SaleAssetScope.PRODUTO_GENETICO;
  }
}

export function shouldApplyOwnershipTransfer(
  assetScope: SaleAssetScope,
  explicit?: boolean,
): boolean {
  if (explicit !== undefined) return explicit;
  return (
    assetScope === SaleAssetScope.COTA_ANIMAL ||
    assetScope === SaleAssetScope.ANIMAL_INTEIRO
  );
}

export function resolveQuotaPercent(
  assetScope: SaleAssetScope,
  quotaPercent?: number | null,
): number {
  if (assetScope === SaleAssetScope.ANIMAL_INTEIRO) return 100;
  if (quotaPercent == null) {
    throw new Error('Informe o percentual da cota vendida');
  }
  if (quotaPercent <= 0 || quotaPercent > 100) {
    throw new Error('Percentual da cota deve estar entre 0 e 100');
  }
  return quotaPercent;
}

/** Aplica venda de cota: transfere `quotaPercent` do animal para o comprador. */
export function applyQuotaSaleToOwnership(
  current: QuotaOwnershipShare[],
  quotaPercent: number,
  buyerPartnerId: string,
  sellerPartnerIds?: string[],
): QuotaOwnershipShare[] {
  const sellers = sellerPartnerIds?.length
    ? current.filter((s) => sellerPartnerIds.includes(s.partnerId))
    : [...current];

  const sellerTotal = sellers.reduce((sum, s) => sum + s.ownershipPercent, 0);
  if (sellerTotal <= 0) {
    throw new Error('Nenhum vendedor com cota para transferir');
  }

  const map = new Map(
    current.map((s) => [s.partnerId, { ...s, ownershipPercent: s.ownershipPercent }]),
  );

  for (const seller of sellers) {
    const reduction = roundPercent((quotaPercent * seller.ownershipPercent) / sellerTotal);
    const row = map.get(seller.partnerId);
    if (!row) continue;
    row.ownershipPercent = roundPercent(row.ownershipPercent - reduction);
    if (row.ownershipPercent <= 0) {
      map.delete(seller.partnerId);
    }
  }

  const buyer = map.get(buyerPartnerId);
  if (buyer) {
    buyer.ownershipPercent = roundPercent(buyer.ownershipPercent + quotaPercent);
  } else {
    map.set(buyerPartnerId, {
      partnerId: buyerPartnerId,
      ownershipPercent: quotaPercent,
      isPrimary: false,
    });
  }

  const result = [...map.values()].filter((s) => s.ownershipPercent > 0.001);
  const total = roundPercent(result.reduce((sum, s) => sum + s.ownershipPercent, 0));
  if (Math.abs(total - 100) > 0.05) {
    throw new Error(`Cotas após transferência somam ${total}% (esperado 100%)`);
  }

  return result;
}

export function ownershipRequiresEvent(assetScope: SaleAssetScope): boolean {
  return (
    assetScope === SaleAssetScope.COTA_ANIMAL ||
    assetScope === SaleAssetScope.ANIMAL_INTEIRO
  );
}
