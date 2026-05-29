import { Decimal } from '@prisma/client/runtime/library';

export function decimalToNumber(value: Decimal | null | undefined): number | null {
  if (value == null) return null;
  return Number(value);
}

export function toDecimal(value: number | null | undefined): Decimal | null {
  if (value == null) return null;
  return new Decimal(value);
}
