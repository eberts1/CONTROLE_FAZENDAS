import { StockMovement, StockMovementType } from '@prisma/client';

export function calculateBalance(movements: Pick<StockMovement, 'type' | 'quantity'>[]): number {
  return movements.reduce((balance, m) => {
    if (m.type === StockMovementType.ENTRADA) return balance + m.quantity;
    if (m.type === StockMovementType.SAIDA) return balance - m.quantity;
    if (m.type === StockMovementType.AJUSTE) return m.quantity;
    return balance;
  }, 0);
}

export const LOW_STOCK_THRESHOLD = 5;
export const EXPIRING_SOON_DAYS = 30;
