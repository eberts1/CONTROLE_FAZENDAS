import { roundMoney } from './finance-allocation.util';
import {
  ParsedInstallmentRow,
  ParsedSaleMapDocument,
  ParsedSaleMapLot,
  parseBrazilianDate,
  parseBrazilianMoney,
} from './sale-map-parser.util';

const BULA_LOT_HEADER =
  /QTD\s+Vlr\s+Unit[aá]rio[^\n]*LOTE\s+COMPRADOR[^\n]*/gi;

const BULA_DATA_LINE =
  /(\d+,\d+)\s+([\d.,]+)\s+([\d.,]+)(?:√|v)?\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)(?:\s+(\d{1,2}))?/;

const BULA_INSTALLMENT =
  /(\d{2}\/\d{2})\s+(\d{2}\/\d{2}\/\d{4})\s+([\d.,]+)/g;

const BULA_DESCRIPTION =
  /\b(MACHO|FEMEA|F[EÊ]MEA|NOVILHA|TOURO|BEZERR[OA]|GARROTE|NOVILHO)\b/i;

function installmentLabel(sequence: number): string {
  return sequence === 0 ? 'Entrada' : `${sequence + 1}ª`;
}

function stripBulaSummarySections(text: string): string {
  const cutoffPatterns = [
    /PRIMEIRAS\s+PARCELAS\s+PARA\s+CADA\s+COMPRADOR/i,
    /Rela[cç][aã]o\s+de\s+contratos\s+digitais/i,
    /\nDefesas\n/i,
  ];

  let end = text.length;
  for (const pattern of cutoffPatterns) {
    const index = text.search(pattern);
    if (index >= 0) {
      end = Math.min(end, index);
    }
  }

  return text.slice(0, end);
}

function parseBulaInstallmentSchedule(text: string): ParsedInstallmentRow[] {
  const rows: ParsedInstallmentRow[] = [];
  let match: RegExpExecArray | null;
  let sequence = 0;

  while ((match = BULA_INSTALLMENT.exec(text)) !== null) {
    rows.push({
      sequence,
      label: installmentLabel(sequence),
      amount: parseBrazilianMoney(match[3]),
      dueDate: parseBrazilianDate(match[2]),
    });
    sequence += 1;
  }

  return rows;
}

function extractBulaRegistration(description: string | null): string | null {
  if (!description) return null;
  const match = description.match(/\b(LCF\s+\d+)\b/i);
  return match?.[1]?.replace(/\s+/g, ' ').trim().toUpperCase() ?? null;
}

function parseBulaBuyerAndData(body: string): {
  buyerName: string | null;
  quantity: number;
  unitValue: number;
  entryAmount: number;
  discountAmount: number;
  grossAmount: number;
  canal: number | null;
} | null {
  const dataMatch = body.match(BULA_DATA_LINE);
  if (!dataMatch) return null;

  const dataIndex = dataMatch.index ?? 0;
  const beforeData = body.slice(0, dataIndex);
  const afterData = body.slice(dataIndex + dataMatch[0].length).trim();

  let canal: number | null = null;
  if (dataMatch[9]) {
    canal = Number.parseInt(dataMatch[9], 10);
  } else {
    const nextLineMatch = afterData.match(/^(\d{1,2})\s*(?:\n|$)/);
    if (nextLineMatch) {
      canal = Number.parseInt(nextLineMatch[1], 10);
    }
  }

  const sameLinePrefix = beforeData.split('\n').pop()?.trim() ?? '';
  const previousLines = beforeData
    .split('\n')
    .slice(0, -1)
    .map((line) => line.trim())
    .filter(
      (line) =>
        line &&
        !/^QTD\b/i.test(line) &&
        !/^Sinal\/Entrada$/i.test(line) &&
        !/^LOTE\s+COMPRADOR$/i.test(line),
    );

  const buyerParts = [...previousLines];
  if (sameLinePrefix) {
    buyerParts.push(sameLinePrefix);
  }

  const trailingNameMatch = afterData.match(/^([A-ZÀ-Ü][A-ZÀ-Ü\s.'-]{1,40})\s*(?:\n|$)/);
  if (trailingNameMatch && !BULA_DESCRIPTION.test(trailingNameMatch[1])) {
    buyerParts.push(trailingNameMatch[1].trim());
  }

  const buyerName = buyerParts.join(' ').replace(/\s+/g, ' ').trim() || null;

  return {
    buyerName,
    quantity: parseBrazilianMoney(dataMatch[1]),
    unitValue: parseBrazilianMoney(dataMatch[2]),
    entryAmount: parseBrazilianMoney(dataMatch[3]),
    discountAmount: parseBrazilianMoney(dataMatch[4]),
    grossAmount: parseBrazilianMoney(dataMatch[8]),
    canal,
  };
}

function splitBulaLotBlocks(text: string): Array<{ canal: number; body: string }> {
  const matches = [...text.matchAll(BULA_LOT_HEADER)];
  const blocks: Array<{ canal: number; body: string }> = [];

  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    const start = (match.index ?? 0) + match[0].length;
    const end = matches[index + 1]?.index ?? text.length;
    const body = text.slice(start, end).trim();
    if (!body) continue;

    const parsed = parseBulaBuyerAndData(body);
    if (!parsed?.canal) continue;

    blocks.push({ canal: parsed.canal, body });
  }

  return blocks;
}

function parseBulaLotBody(canal: number, body: string): ParsedSaleMapLot {
  const parsed = parseBulaBuyerAndData(body);
  const descriptionMatch = body.match(
    new RegExp(`(${BULA_DESCRIPTION.source}[^\n]+)`, 'i'),
  );
  const description = descriptionMatch?.[1]?.trim() ?? null;
  const registration = extractBulaRegistration(description);
  const installments = parseBulaInstallmentSchedule(body);
  const isCashPayment =
    /\bÀ\s+VISTA\b/i.test(body) ||
    (installments.length === 1 && /\b01\/01\b/.test(body));

  const grossAmount = parsed?.grossAmount ?? null;
  const discountAmount = parsed?.discountAmount ?? null;
  const entryAmount = parsed?.entryAmount ?? null;
  const netAmount =
    grossAmount != null
      ? roundMoney(grossAmount - (discountAmount ?? 0))
      : null;

  return {
    canal,
    description,
    registration,
    bidValue: parsed?.unitValue ?? null,
    captures: 1,
    quantity: parsed?.quantity ?? 1,
    totalAmount: grossAmount,
    buyerName: parsed?.buyerName ?? null,
    purchasePercent: 100,
    grossAmount,
    netAmount,
    discountAmount,
    entryAmount,
    isCashPayment,
    installments,
  };
}

export function parseBulaRematesSaleMapText(text: string): ParsedSaleMapDocument {
  const normalized = stripBulaSummarySections(text.replace(/\r\n/g, '\n'));
  const eventNameMatch = normalized.match(
    /BULA\s+REMATES\s*\n([^\n]+)\n([^\n]+ - [A-Z]{2})/i,
  );
  const dateMatch = normalized.match(/(\d{2}\/\d{2}\/\d{4})\s*-\s*\d{2}:\d{2}h/i);
  const sellerMatch = normalized.match(/\n([A-ZÀ-Ü][^\n]+)\nEndere[cç]o:/i);

  const lots = splitBulaLotBlocks(normalized).map(({ canal, body }) =>
    parseBulaLotBody(canal, body),
  );

  return {
    eventName: eventNameMatch?.[1]?.trim() ?? null,
    eventDate: dateMatch ? parseBrazilianDate(dateMatch[1]) : null,
    location: eventNameMatch?.[2]?.trim() ?? null,
    sellerName: sellerMatch?.[1]?.trim() ?? null,
    lots,
  };
}
