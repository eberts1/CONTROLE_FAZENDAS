import * as cheerio from 'cheerio';
import { AnimalSex, type AbczAnimalCandidate, type AbczAnimalDetail } from '@controle-fazendas/shared';

function mapSex(value: string): AnimalSex {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'macho' || normalized === 'm') return AnimalSex.MACHO;
  return AnimalSex.FEMEA;
}

function parseBrDate(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed || trimmed === '-') return null;
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmed);
  if (!match) return null;
  return `${match[3]}-${match[2]}-${match[1]}`;
}

function cleanText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

export function parseBuscaSerieHtml(html: string): AbczAnimalCandidate[] {
  const $ = cheerio.load(html);
  const candidates: AbczAnimalCandidate[] = [];

  $('tr[title^="Clique"]').each((_, row) => {
    const $row = $(row);
    const $anchor = $row.find('td[data-idAnimal]').first();
    if (!$anchor.length) return;

    const cells = $row
      .find('td')
      .toArray()
      .slice(0, 7)
      .map((cell) => cleanText($(cell).text()));

    const name = cells[0] ?? '';
    const nickname = cells[1] && cells[1] !== '-' ? cells[1] : null;
    const registration = cells[2] ?? '';
    const breed = cells[3] ?? '';
    const category = cells[4] ?? '';
    const sexRaw = cells[5] ?? $anchor.attr('data-sexo') ?? '';
    const birthDate = parseBrDate(cells[6] ?? '');

    const permiteConsulta = (
      $anchor.attr('data-permiteconsulta') ??
      $anchor.attr('data-PermiteConsulta') ??
      'N'
    ).toUpperCase();

    candidates.push({
      abczAnimalId: $anchor.attr('data-idanimal') ?? $anchor.attr('data-idAnimal') ?? '',
      name,
      nickname,
      registration,
      breed,
      category,
      sex: mapSex(sexRaw),
      birthDate,
      /** ABCZ usa S (completo) ou P (parcial/público) — ambos permitem genealogia */
      allowsDetail: permiteConsulta === 'S' || permiteConsulta === 'P',
      permiteConsulta,
      serie: $anchor.attr('data-serie') ?? '',
      rgn: $anchor.attr('data-rgn') ?? '',
      rgd: $anchor.attr('data-rgd') ?? '',
      breedCode: Number($anchor.attr('data-raca') ?? 0),
      categoryCode: Number($anchor.attr('data-categoria') ?? 0),
      ownerId: $anchor.attr('data-proprietario') ?? '',
    });
  });

  return candidates.filter((c) => c.abczAnimalId && c.name);
}

export function parseCabecalhoHtml(html: string): AbczAnimalDetail {
  const $ = cheerio.load(html);
  const fields: Record<string, string> = {};

  $('table.fontedadosdoanimal tr').each((_, row) => {
    const cells = $(row).find('td');
    if (cells.length < 2) return;
    const label = cleanText($(cells[0]).text()).replace(':', '');
    const value = cleanText($(cells[1]).find('strong').text() || $(cells[1]).text());
    if (label) fields[label] = value;
  });

  return {
    coat: fields['Pelagem'] && fields['Pelagem'] !== '-' ? fields['Pelagem'] : null,
    city: fields['Município'] && fields['Município'] !== '-' ? fields['Município'] : null,
    state: fields['UF'] && fields['UF'] !== '-' ? fields['UF'] : null,
    situation: fields['Situação'] && fields['Situação'] !== '-' ? fields['Situação'] : null,
    owner: fields['Proprietário'] && fields['Proprietário'] !== '-' ? fields['Proprietário'] : null,
    farm: fields['Fazenda'] && fields['Fazenda'] !== '-' ? fields['Fazenda'] : null,
    breeder: fields['Criador'] && fields['Criador'] !== '-' ? fields['Criador'] : null,
  };
}

export function hasSearchResults(html: string): boolean {
  return html.includes('tablePadraoGenealogia') && html.includes('data-idAnimal');
}

export interface ParsedGenealogyEntry {
  relationship: string;
  registration: string;
  name: string;
  abczAnimalId: string | null;
  sortOrder: number;
  generation: number;
  slot: number;
}

export interface ParsedGeneticDep {
  description: string;
  dep: string;
  accuracy: string | null;
  deca: string | null;
}

export interface ParsedGeneticEvaluation {
  period: string | null;
  evaluationKind: string | null;
  iabcz: string | null;
  deca: string | null;
  inbreedingF: string | null;
  deps: ParsedGeneticDep[];
}

export interface ParsedReproductiveResult {
  message: string | null;
  rows: { label: string; value: string }[] | null;
}

function normalizeRelationship(label: string): string {
  const lower = label.toLowerCase();
  if (lower.includes('animal')) return 'ANIMAL';
  if (lower.includes('pai')) return 'PAI';
  if (lower.includes('mãe') || lower.includes('mae')) return 'MAE';
  return label.toUpperCase();
}

function parseGenealogyLabel(
  $: cheerio.CheerioAPI,
  $label: ReturnType<cheerio.CheerioAPI>,
) {
  const strongText = cleanText($label.find('strong').text());
  const relationshipMatch = /^(Animal|Pai|M[ãa]e)\s*:/i.exec(strongText);
  if (!relationshipMatch) return null;

  const relationship = normalizeRelationship(relationshipMatch[1]);
  const labelText = cleanText($label.text());
  const registrationMatch = /^(Animal|Pai|M[ãa]e)\s*:\s*(.+)$/i.exec(labelText);
  const registration = registrationMatch ? cleanText(registrationMatch[2]) : '';

  const $container = $label.parent();
  const $link = $container.find('a.linkGenealogia').first();
  let name = '';
  let abczAnimalId = $label.attr('data-ordem') ?? null;

  if ($link.length) {
    name = cleanText($link.text());
    abczAnimalId = abczAnimalId ?? $link.attr('data-ordem') ?? null;
  } else {
    name = cleanText($container.find('span').first().text());
  }

  if (!registration && !name) return null;

  return {
    relationship,
    registration,
    name: name || registration,
    abczAnimalId,
  };
}

export function parseGenealogyHtml(html: string): ParsedGenealogyEntry[] {
  const $ = cheerio.load(html);
  const entries: ParsedGenealogyEntry[] = [];
  const slotsByGeneration = new Map<number, number>();

  $('table.tablePadraoGenealogia tbody tr').each((_, row) => {
    $(row)
      .find('td')
      .each((colIndex, cell) => {
        const $label = $(cell).find('label.labelNomeDoAnimal').first();
        if (!$label.length) return;

        const parsed = parseGenealogyLabel($, $label);
        if (!parsed) return;

        const generation = colIndex;
        const slot = slotsByGeneration.get(generation) ?? 0;
        slotsByGeneration.set(generation, slot + 1);

        entries.push({
          ...parsed,
          generation,
          slot,
          sortOrder: entries.length,
        });
      });
  });

  if (entries.length > 0) return entries;

  $('label.labelNomeDoAnimal').each((_, element) => {
    const parsed = parseGenealogyLabel($, $(element));
    if (!parsed) return;

    entries.push({
      ...parsed,
      generation: parsed.relationship === 'ANIMAL' ? 0 : -1,
      slot: entries.length,
      sortOrder: entries.length,
    });
  });

  return entries;
}

export function parseGeneticEvaluationHtml(html: string): ParsedGeneticEvaluation[] {
  const lowered = html.toLowerCase();
  if (
    lowered.includes('não possui') ||
    lowered.includes('nao possui') ||
    lowered.includes('nenhum dado') ||
    lowered.includes('alert-error')
  ) {
    return [];
  }

  const $ = cheerio.load(html);
  const headerTexts: string[] = [];
  $('tr.bgCinzaPadrao td[colspan]').each((_, cell) => {
    const text = cleanText($(cell).text());
    if (text) headerTexts.push(text);
  });

  const period = headerTexts.find((t) => /^\d{4}-\d/.test(t)) ?? null;
  const evaluationKind =
    headerTexts.find((t) => t.toLowerCase().includes('genôm') || t.toLowerCase().includes('genom')) ??
    null;

  let iabcz: string | null = null;
  let deca: string | null = null;
  let inbreedingF: string | null = null;

  $('table table tr').each((_, row) => {
    const cells = $(row)
      .find('td')
      .toArray()
      .map((cell) => cleanText($(cell).text()));
    if (cells.length >= 3 && cells[0].includes('iABCZ')) {
      const valueRow = $(row).next('tr').find('td');
      if (valueRow.length >= 3) {
        iabcz = cleanText($(valueRow.get(0)).text()) || null;
        deca = cleanText($(valueRow.get(1)).text()) || null;
        inbreedingF = cleanText($(valueRow.get(2)).text()) || null;
      }
    }
  });

  const deps: ParsedGeneticDep[] = [];
  $('tr').each((_, row) => {
    const cells = $(row)
      .find('td')
      .toArray()
      .map((cell) => cleanText($(cell).text()));
    if (cells.length < 4 || cells.length > 5) return;
    const description = cells[0];
    if (
      !description ||
      description.includes('DESCRIÇÃO') ||
      description.includes('REPRESENT') ||
      description.includes('Avaliação')
    ) {
      return;
    }
    deps.push({
      description,
      dep: cells[1] ?? '',
      accuracy: cells[2] ?? null,
      deca: cells[3] ?? null,
    });
  });

  if (!period && !evaluationKind && deps.length === 0 && !iabcz) {
    return [];
  }

  return [
    {
      period,
      evaluationKind,
      iabcz,
      deca,
      inbreedingF,
      deps,
    },
  ];
}

export function parseReproductiveHtml(html: string): ParsedReproductiveResult {
  const $ = cheerio.load(html);
  const plain = cleanText($.root().text());

  if (plain.toLowerCase().includes('nenhum dado reprodutivo')) {
    return { message: 'Nenhum dado reprodutivo encontrado na ABCZ.', rows: null };
  }

  const rows: { label: string; value: string }[] = [];
  $('table tr').each((_, row) => {
    const cells = $(row).find('td');
    if (cells.length < 2) return;
    const label = cleanText($(cells[0]).text());
    const value = cleanText($(cells[1]).text());
    if (label && value && !label.includes('DESCRIÇÃO')) {
      rows.push({ label, value });
    }
  });

  if (rows.length > 0) return { message: null, rows };

  return { message: plain || 'Sem dados reprodutivos.', rows: null };
}

export function parseEfficiencyHtml(html: string): string | null {
  const $ = cheerio.load(html);
  const alert = cleanText($('.alert-error strong').text() || $('.alert strong').text());
  if (alert) return alert;
  const plain = cleanText($.root().text());
  if (plain.toLowerCase().includes('não possui') || plain.toLowerCase().includes('nao possui')) {
    return plain;
  }
  return null;
}

export function canAccessAbczSection(permissions: string | null, index: number): boolean {
  if (!permissions) return true;
  const parts = permissions.split(';');
  const flag = (parts[index] ?? '').toUpperCase();
  /** S = sim, P = parcial — I/N = indisponível/negado */
  return flag === 'S' || flag === 'P';
}
