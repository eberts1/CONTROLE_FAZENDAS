import { formatDocument, normalizeDocument } from './partner-document.util';

export interface ParsedBuyerRow {
  name: string;
  document: string | null;
  email: string | null;
  phone: string | null;
  phone2: string | null;
  phone3: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  ranchName: string | null;
  ranchCity: string | null;
  ranchState: string | null;
  ranchRegistration: string | null;
  rawBlock: string;
}

const CPF_PATTERN = /\d{3}\.\d{3}\.\d{3}-\d{2}/;
const CNPJ_PATTERN = /\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/;
const PHONE_PATTERN = /\(\d{2}\)[\d-]+/;
const CEP_PATTERN = /\d{5}-\d{3}/;
const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const STATE_CITY_PATTERN = /^([A-Z]{2})\s*-\s*(.+)$/;

const SKIP_LINE =
  /^(RELAÇÃO DE COMPRADORES|BULA REMATES|NOME\s|ENDEREÇO\s|UF\s*-|FONE|FAX|CELULAR|CLIENTES|Inscrição|Pág\.:|MATHEUS HENRIQUE|\d{2}\/\d{2}\/\d{4})/i;

const FOOTER_LINE =
  /^(MATHEUS HENRIQUE EBERTS|RUA QUINZE DE NOVEMBRO|FONE:\s*\(|Pág\.:|BULA REMATES|-- \d+ of \d+ --)/i;

function isHeaderOrFooter(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return true;
  if (SKIP_LINE.test(trimmed)) return true;
  if (FOOTER_LINE.test(trimmed)) return true;
  if (/^FAZENDA\s+(Inscrição|$)/i.test(trimmed)) return true;
  if (/^ENDEREÇO\s*$/i.test(trimmed)) return true;
  if (/^NOME\s*$/i.test(trimmed)) return true;
  if (/^\d+°\s+LEILÃO/i.test(trimmed)) return true;
  if (/^CAMPO GRANDE/i.test(trimmed)) return true;
  if (/CPF\/CNPJ/i.test(trimmed)) return true;
  if (/Estabelecimento/i.test(trimmed)) return true;
  if (/MUNICÍPIO/i.test(trimmed)) return true;
  return false;
}

function splitCityAndRegistration(value: string | null): {
  city: string | null;
  registration: string | null;
} {
  if (!value?.trim()) return { city: null, registration: null };
  const parts = value.split(/\t+/).map((p) => p.trim()).filter(Boolean);
  if (parts.length <= 1) return { city: value.trim(), registration: null };
  const registration = parts.find((p) => /\d/.test(p) || /SEM\s+IE/i.test(p)) ?? null;
  const city = parts.find((p) => p !== registration) ?? parts[0];
  return { city: city ?? null, registration };
}

function parseStateCity(line: string): { state: string | null; city: string | null } {
  const match = line.trim().match(STATE_CITY_PATTERN);
  if (!match) return { state: null, city: null };
  const { city } = splitCityAndRegistration(match[2].trim());
  return { state: match[1], city };
}

function isAddressContinuation(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed.length > 40) return false;
  if (CPF_PATTERN.test(trimmed) || CNPJ_PATTERN.test(trimmed)) return false;
  if (PHONE_PATTERN.test(trimmed)) return false;
  if (EMAIL_PATTERN.test(trimmed)) return false;
  if (CEP_PATTERN.test(trimmed)) return false;
  if (STATE_CITY_PATTERN.test(trimmed)) return false;
  if (/^(?:FAZENDA|Fazenda|CENTRAL|RUA|AVENIDA|RODOVIA|TV|PRAÇA|RUA:|ANTONIO|END\s)/i.test(trimmed)) {
    return false;
  }
  if (/^\d/.test(trimmed)) return false;
  return trimmed === trimmed.toUpperCase();
}

function isCityContinuation(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 40) return false;
  if (CPF_PATTERN.test(trimmed) || PHONE_PATTERN.test(trimmed) || EMAIL_PATTERN.test(trimmed)) {
    return false;
  }
  if (CEP_PATTERN.test(trimmed)) return false;
  if (/^(?:FAZENDA|Fazenda)\s+/i.test(trimmed)) return false;
  return /^[A-ZÁÉÍÓÚÂÊÔÃÕÇ\s-]+$/.test(trimmed);
}

function isSplitRegistrationLine(line: string): boolean {
  const trimmed = line.trim();
  return /^\d[\d./-]*$/.test(trimmed) && trimmed.length >= 8;
}

function mergeBrokenLines(lines: string[]): string[] {
  const merged: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    if (line.endsWith('/') || /\t\/\s*$/.test(line)) {
      const next = lines[i + 1];
      if (next && isSplitRegistrationLine(next)) {
        line = `${line.replace(/\s+$/, '')}${next.trim()}`;
        i++;
      }
    }

    if (STATE_CITY_PATTERN.test(line.trim()) && !CEP_PATTERN.test(line)) {
      const next = lines[i + 1];
      if (next && isCityContinuation(next)) {
        const afterNext = lines[i + 2];
        if (afterNext && (CEP_PATTERN.test(afterNext) || STATE_CITY_PATTERN.test(afterNext))) {
          line = `${line} ${next.trim()}`;
          i++;
        }
      }
    }

    const next = lines[i + 1];
    if (next && isAddressContinuation(next)) {
      const afterNext = lines[i + 2];
      if (
        afterNext &&
        (CPF_PATTERN.test(afterNext) ||
          CNPJ_PATTERN.test(afterNext) ||
          PHONE_PATTERN.test(afterNext))
      ) {
        line = `${line} ${next.trim()}`;
        i++;
      }
    }

    merged.push(line);
  }

  return merged;
}

function parseRanchLine(line: string): {
  ranchName: string | null;
  ranchCity: string | null;
  ranchState: string | null;
  ranchRegistration: string | null;
} {
  const trimmed = line.trim();

  const fazendaMatch = trimmed.match(/^(?:FAZENDA|Fazenda)\s+(.+?)(?:\s{2,}|\t)(.+)$/i);
  if (fazendaMatch) {
    return parseRanchRest(fazendaMatch[1].trim(), fazendaMatch[2].trim());
  }

  const tabParts = trimmed.split(/\t+/).map((p) => p.trim()).filter(Boolean);
  if (tabParts.length >= 2) {
    const locationPart = tabParts.find((p) => STATE_CITY_PATTERN.test(p));
    if (locationPart) {
      const nameParts = tabParts.filter((p) => p !== locationPart);
      const registrationPart = nameParts.find((p) => /\d/.test(p) && !STATE_CITY_PATTERN.test(p));
      const ranchName = nameParts.find((p) => p !== registrationPart) ?? nameParts[0];
      const parsed = parseRanchRest(ranchName ?? '', locationPart + (registrationPart ? `\t${registrationPart}` : ''));
      if (registrationPart && !parsed.ranchRegistration) {
        parsed.ranchRegistration = registrationPart;
      }
      return parsed;
    }
  }

  if (/^(?:FAZENDA|Fazenda)\s+/i.test(trimmed)) {
    return {
      ranchName: trimmed.replace(/^(?:FAZENDA|Fazenda)\s+/i, '').trim() || null,
      ranchCity: null,
      ranchState: null,
      ranchRegistration: null,
    };
  }

  return { ranchName: null, ranchCity: null, ranchState: null, ranchRegistration: null };
}

function parseRanchRest(
  ranchName: string,
  rest: string,
): {
  ranchName: string | null;
  ranchCity: string | null;
  ranchState: string | null;
  ranchRegistration: string | null;
} {
  const parts = rest.split(/\t+/).map((p) => p.trim()).filter(Boolean);
  let ranchRegistration: string | null = null;
  let ranchCity: string | null = null;
  let ranchState: string | null = null;

  for (const part of parts) {
    const stateCity = parseStateCity(part);
    if (stateCity.state) {
      ranchState = stateCity.state;
      ranchCity = stateCity.city;
      continue;
    }
    if (/\d/.test(part) || /SEM\s+IE/i.test(part)) {
      ranchRegistration = ranchRegistration ? `${ranchRegistration} ${part}` : part;
    }
  }

  if (!ranchState) {
    const stateCity = parseStateCity(rest);
    ranchState = stateCity.state;
    ranchCity = stateCity.city;
    const ieMatch = rest.match(/(\d[\d./-]+(?:\s*\/\s*[\d]+)?|SEM\s+IE\s*\/\s*[\d]+)/i);
    if (ieMatch) ranchRegistration = ieMatch[1].trim();
    else if (!stateCity.state) ranchRegistration = rest.trim() || null;
  }

  return {
    ranchName: ranchName || null,
    ranchCity,
    ranchState,
    ranchRegistration,
  };
}

function extractNameAndDocument(line: string): { name: string; document: string | null } {
  const docMatch = line.match(CPF_PATTERN) ?? line.match(CNPJ_PATTERN);
  if (docMatch) {
    const name = line.replace(docMatch[0], '').trim();
    return { name, document: formatDocument(docMatch[0]) };
  }
  return { name: line.trim(), document: null };
}

function isDirectionLine(line: string): boolean {
  return /^(END\s|NA PRINCIPAL|ENTRA ESQUERDA|KM \d)/i.test(line.trim());
}

function parseBuyerBlock(lines: string[]): ParsedBuyerRow | null {
  const content = mergeBrokenLines(lines.map((l) => l.trim()).filter(Boolean));
  if (content.length < 3) return null;

  let name: string | null = null;
  let document: string | null = null;
  const addressParts: string[] = [];
  const phones: string[] = [];
  let city: string | null = null;
  let state: string | null = null;
  let zipCode: string | null = null;
  let ranchName: string | null = null;
  let ranchCity: string | null = null;
  let ranchState: string | null = null;
  let ranchRegistration: string | null = null;
  let email: string | null = null;
  const directionNotes: string[] = [];

  let phase: 'name' | 'address' | 'after_doc' = 'name';

  for (let i = 0; i < content.length; i++) {
    const line = content[i];

    const emailMatch = line.match(EMAIL_PATTERN);
    if (emailMatch) {
      email = emailMatch[0].toLowerCase();
      continue;
    }

    const docMatch = line.match(CPF_PATTERN) ?? line.match(CNPJ_PATTERN);
    if (docMatch && !document) {
      if (!name) {
        const extracted = extractNameAndDocument(line);
        name = extracted.name;
        document = extracted.document;
      } else {
        document = formatDocument(docMatch[0]);
      }
      phase = 'after_doc';
      const phoneMatches = line.match(new RegExp(PHONE_PATTERN.source, 'g'));
      if (phoneMatches) phones.push(...phoneMatches);
      continue;
    }

    const phoneMatches = line.match(new RegExp(PHONE_PATTERN.source, 'g'));
    if (phoneMatches && document && phase !== 'name' && !line.match(CPF_PATTERN)) {
      phones.push(...phoneMatches);
      continue;
    }

    const cepOnly = line.match(new RegExp(`^${CEP_PATTERN.source}$`));
    if (cepOnly) {
      zipCode = cepOnly[0];
      continue;
    }

    const cepMatch = line.match(CEP_PATTERN);
    const lineWithoutCep = line.replace(CEP_PATTERN, '').trim();
    const stateCity = parseStateCity(lineWithoutCep);
    if (cepMatch || stateCity.state) {
      if (cepMatch) zipCode = cepMatch[0];
      if (stateCity.state && !city && !ranchName) {
        city = stateCity.city;
        state = stateCity.state;
      } else if (stateCity.state && ranchName && !ranchCity) {
        ranchCity = stateCity.city;
        ranchState = stateCity.state;
      } else if (stateCity.state && !ranchName) {
        city = stateCity.city;
        state = stateCity.state;
      }
      continue;
    }

    const ranch = parseRanchLine(line);
    if (ranch.ranchName) {
      ranchName = ranch.ranchName;
      if (ranch.ranchCity) ranchCity = ranch.ranchCity;
      if (ranch.ranchState) ranchState = ranch.ranchState;
      if (ranch.ranchRegistration) ranchRegistration = ranch.ranchRegistration;
      phase = 'after_doc';
      continue;
    }

    if (isDirectionLine(line)) {
      directionNotes.push(line);
      continue;
    }

    if (phase === 'name' && !name) {
      const extracted = extractNameAndDocument(line);
      name = extracted.name;
      if (extracted.document) {
        document = extracted.document;
        phase = 'address';
      } else {
        phase = 'address';
      }
      continue;
    }

    if (phase === 'address' || (document && !city && !ranchName)) {
      addressParts.push(line);
      continue;
    }

    if (ranchName && !ranchRegistration && !isDirectionLine(line)) {
      const extraRanch = parseRanchLine(line);
      if (extraRanch.ranchRegistration) {
        ranchRegistration = extraRanch.ranchRegistration;
      } else if (!EMAIL_PATTERN.test(line)) {
        directionNotes.push(line);
      }
    }
  }

  if (!name || !document) return null;

  let address = addressParts.length > 0 ? addressParts.join(', ') : null;
  if (directionNotes.length > 0) {
    const notes = directionNotes.join(' ');
    address = address ? `${address} — ${notes}` : notes;
  }

  return {
    name,
    document,
    email,
    phone: phones[0] ?? null,
    phone2: phones[1] ?? null,
    phone3: phones[2] ?? null,
    address,
    city,
    state,
    zipCode,
    ranchName,
    ranchCity,
    ranchState,
    ranchRegistration,
    rawBlock: content.join('\n'),
  };
}

function splitBlocksByEmail(lines: string[]): string[][] {
  const blocks: string[][] = [];
  let current: string[] = [];

  for (const line of lines) {
    current.push(line);
    if (EMAIL_PATTERN.test(line)) {
      blocks.push(current);
      current = [];
    }
  }

  return blocks;
}

export function detectBuyerListFormat(text: string): boolean {
  return /RELAÇÃO DE COMPRADORES/i.test(text) && /BULA REMATES/i.test(text);
}

export function parseBulaBuyerListText(text: string): ParsedBuyerRow[] {
  if (!detectBuyerListFormat(text)) {
    return [];
  }

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !isHeaderOrFooter(l));

  const blocks = splitBlocksByEmail(lines);
  const buyers: ParsedBuyerRow[] = [];

  for (const block of blocks) {
    const parsed = parseBuyerBlock(block);
    if (!parsed) continue;

    const dup = buyers.find(
      (b) =>
        normalizeDocument(b.document) === normalizeDocument(parsed.document) &&
        normalizeDocument(parsed.document),
    );
    if (!dup) buyers.push(parsed);
  }

  return buyers;
}
