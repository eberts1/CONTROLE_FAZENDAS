import { roundMoney } from './finance-allocation.util';
import { parseBulaRematesSaleMapText } from './bula-remates-sale-map-parser.util';

export interface ParsedInstallmentRow {
  sequence: number;
  label: string;
  amount: number;
  dueDate: string;
}

export interface ParsedSaleMapLot {
  canal: number;
  description: string | null;
  registration: string | null;
  bidValue: number | null;
  captures: number | null;
  quantity: number | null;
  totalAmount: number | null;
  buyerName: string | null;
  purchasePercent: number | null;
  grossAmount: number | null;
  netAmount: number | null;
  discountAmount: number | null;
  entryAmount: number | null;
  isCashPayment: boolean;
  installments: ParsedInstallmentRow[];
}

export interface ParsedSaleMapDocument {
  eventName: string | null;
  eventDate: string | null;
  location: string | null;
  sellerName: string | null;
  lots: ParsedSaleMapLot[];
}

export function parseBrazilianMoney(value: string): number {
  const normalized = value.trim().replace(/\./g, '').replace(',', '.');
  const parsed = Number.parseFloat(normalized);
  if (Number.isNaN(parsed)) {
    throw new Error(`Valor monetário inválido: ${value}`);
  }
  return roundMoney(parsed);
}

export function parseBrazilianDate(value: string): string {
  const [day, month, year] = value.split('/').map(Number);
  if (!day || !month || !year) {
    throw new Error(`Data inválida: ${value}`);
  }
  return new Date(Date.UTC(year, month - 1, day)).toISOString();
}

function installmentLabel(sequence: number): string {
  return sequence === 0 ? 'Entrada' : `${sequence + 1}ª`;
}

export function parseInstallmentSchedule(text: string): ParsedInstallmentRow[] {
  const pattern = /([\d.,]+)\s+(\d{2}\/\d{2}\/\d{4})/g;
  const rows: ParsedInstallmentRow[] = [];
  let match: RegExpExecArray | null;
  let sequence = 0;

  while ((match = pattern.exec(text)) !== null) {
    rows.push({
      sequence,
      label: installmentLabel(sequence),
      amount: parseBrazilianMoney(match[1]),
      dueDate: parseBrazilianDate(match[2]),
    });
    sequence += 1;
  }

  return rows;
}

interface ParsedBuyerLine {
  buyerName: string;
  purchasePercent: number;
  grossAmount: number;
  netAmount: number;
  entryAmount: number;
  discountAmount: number;
}

function parseBuyerLine(body: string): ParsedBuyerLine | null {
  const spacedMatch = body.match(
    /\n([^\n]+?)\s+([\d.,]+)%\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\/([\d.,]+)/,
  );
  if (spacedMatch) {
    return {
      buyerName: spacedMatch[1].trim(),
      purchasePercent: parseBrazilianMoney(spacedMatch[2]),
      grossAmount: parseBrazilianMoney(spacedMatch[3]),
      netAmount: parseBrazilianMoney(spacedMatch[4]),
      entryAmount: parseBrazilianMoney(spacedMatch[5]),
      discountAmount: parseBrazilianMoney(spacedMatch[6]),
    };
  }

  const mergedMatch = body.match(
    /\n([^\n]+?)\s+([\d.,]+)%\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+),([\d.,]+),([\d.,]+)\/([\d.,]+)/,
  );
  if (mergedMatch) {
    return {
      buyerName: mergedMatch[1].trim(),
      purchasePercent: parseBrazilianMoney(mergedMatch[2]),
      grossAmount: parseBrazilianMoney(mergedMatch[3]),
      netAmount: parseBrazilianMoney(mergedMatch[4]),
      entryAmount: parseBrazilianMoney(mergedMatch[5]),
      discountAmount: parseBrazilianMoney(mergedMatch[6]),
    };
  }

  return null;
}

function splitLotBlocks(text: string): Array<{ canal: number; body: string }> {
  const matches = [...text.matchAll(/(?:^|\n)(\d{2})(?=\s+[\d.,]+|\s*\n\s*[\d.,]+)/g)];
  const blocks: Array<{ canal: number; body: string }> = [];

  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    const canal = Number.parseInt(match[1], 10);
    if (Number.isNaN(canal)) continue;

    const start = (match.index ?? 0) + (match[0].startsWith('\n') ? 1 : 0);
    const end = matches[index + 1]?.index ?? text.length;
    const body = text.slice(start, end).trim();
    if (!body) continue;

    blocks.push({ canal, body });
  }

  return blocks;
}

function parseLotBody(canal: number, body: string): ParsedSaleMapLot {
  const descriptionMatch = body.match(/\d+\s+-\s+([^\n]+)/);
  const registrationMatch =
    body.match(/Registro\(s\)\s+(GSCA?\s+\d+)/i) ??
    body.match(/Registro\(s\)\s+(\S+\s+\d+)/i);

  const compactHeaderMatch = body.match(
    /^(\d{2})\s+([\d.,]+)\s+30\s+1\s+([\d.,]+)%/m,
  );
  const multilineHeaderMatch = body.match(
    /^(\d{2})\s*\n\s*([\d.,]+)\s+X\s+30\s+X\s+1\s+X\s+([\d.,]+)%/m,
  );
  const bidMatch = body.match(/Valor Lance\s+([\d.,]+)/i);
  const capturesMatch = body.match(/Capta\S+\s+(\d+)/i);
  const quantityMatch = body.match(/Animais\s+(\d+)/i);
  const totalMatch = body.match(/R\$\s*([\d.,]+)/i);

  const buyer = parseBuyerLine(body);
  const installments = parseInstallmentSchedule(body);
  const netAmount = buyer?.netAmount ?? null;
  const entryAmount = buyer?.entryAmount ?? null;

  const isCashPayment =
    netAmount != null &&
    entryAmount != null &&
    Math.abs(netAmount - entryAmount) < 0.01 &&
    installments.length === 0;

  const bidValue = compactHeaderMatch
    ? parseBrazilianMoney(compactHeaderMatch[2])
    : multilineHeaderMatch
      ? parseBrazilianMoney(multilineHeaderMatch[2])
      : bidMatch
        ? parseBrazilianMoney(bidMatch[1])
        : null;

  return {
    canal,
    description: descriptionMatch?.[1]?.trim() ?? null,
    registration: registrationMatch?.[1] ?? null,
    bidValue,
    captures: capturesMatch ? Number.parseInt(capturesMatch[1], 10) : 30,
    quantity: quantityMatch ? Number.parseInt(quantityMatch[1], 10) : 1,
    totalAmount: totalMatch ? parseBrazilianMoney(totalMatch[1]) : null,
    buyerName: buyer?.buyerName ?? null,
    purchasePercent: buyer?.purchasePercent ?? null,
    grossAmount: buyer?.grossAmount ?? null,
    netAmount,
    discountAmount: buyer?.discountAmount ?? null,
    entryAmount,
    isCashPayment,
    installments,
  };
}

export type SaleMapSourceFormat = 'PROGRAMA_LEILOES' | 'BULA_REMATES';

export function detectSaleMapSourceFormat(text: string): SaleMapSourceFormat {
  const normalized = text.replace(/\r\n/g, '\n');
  if (/BULA\s+REMATES/i.test(normalized) && /FATURA\s+DE\s+VENDA/i.test(normalized)) {
    return 'BULA_REMATES';
  }
  return 'PROGRAMA_LEILOES';
}

function parseProgramaLeiloesSaleMapText(text: string): ParsedSaleMapDocument {
  const normalized = text.replace(/\r\n/g, '\n');
  const headerMatch = normalized.match(/(Virtual Fazenda[^\n]+?)\s+-\s+(\d{2}\/\d{2}\/\d{4})/i);
  const locationMatch = normalized.match(/\n([^\n]+)\nVendedor/i);
  const sellerMatch = normalized.match(/Vendedor\s*:?\s*(.+)/i);

  const lots = splitLotBlocks(normalized).map(({ canal, body }) => parseLotBody(canal, body));

  return {
    eventName: headerMatch?.[1]?.trim() ?? null,
    eventDate: headerMatch ? parseBrazilianDate(headerMatch[2]) : null,
    location: locationMatch?.[1]?.trim() ?? null,
    sellerName: sellerMatch?.[1]?.trim() ?? null,
    lots,
  };
}

export function parseSaleMapText(text: string): ParsedSaleMapDocument {
  const format = detectSaleMapSourceFormat(text);
  if (format === 'BULA_REMATES') {
    return parseBulaRematesSaleMapText(text);
  }
  return parseProgramaLeiloesSaleMapText(text);
}

export function validateInstallmentTotals(
  netAmount: number,
  installments: Pick<ParsedInstallmentRow, 'amount'>[],
  tolerance = 0.05,
): boolean {
  const total = roundMoney(installments.reduce((sum, row) => sum + row.amount, 0));
  return Math.abs(total - netAmount) <= tolerance;
}
