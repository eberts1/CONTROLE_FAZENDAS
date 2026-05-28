/**
 * Valida parser + perfil completo IMPR 160 (após correção PermiteConsulta P)
 * node apps/api/scripts/test-abcz-impr160-parse.mjs
 */
import * as cheerio from 'cheerio';

const BASE = process.env.ABCZ_BASE_URL ?? 'https://zebu.org.br';

// Copia mínima da lógica do parser (evita build TS)
function parseBuscaSerieHtml(html) {
  const $ = cheerio.load(html);
  const candidates = [];
  $('tr[title^="Clique"]').each((_, row) => {
    const $row = $(row);
    const $anchor = $row.find('td[data-idAnimal]').first();
    if (!$anchor.length) return;
    const permiteConsulta = (
      $anchor.attr('data-permiteconsulta') ??
      $anchor.attr('data-PermiteConsulta') ??
      'N'
    ).toUpperCase();
    candidates.push({
      abczAnimalId: $anchor.attr('data-idanimal') ?? $anchor.attr('data-idAnimal') ?? '',
      allowsDetail: permiteConsulta === 'S' || permiteConsulta === 'P',
      permiteConsulta,
      serie: $anchor.attr('data-serie') ?? '',
      rgn: $anchor.attr('data-rgn') ?? '',
    });
  });
  return candidates;
}

async function postForm(path, body, cookies) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: cookies ?? '',
      'User-Agent': 'ControleFazendas-Test/1.0',
    },
    body: new URLSearchParams(body).toString(),
  });
  const setCookie = res.headers.getSetCookie?.() ?? [];
  const merged = [...(cookies ? [cookies] : []), ...setCookie.map((c) => c.split(';')[0])]
    .filter(Boolean)
    .join('; ');
  return { html: await res.text(), cookies: merged };
}

async function main() {
  const session = await fetch(`${BASE}/ConsultaIndividual`, {
    headers: { 'User-Agent': 'ControleFazendas-Test/1.0' },
  });
  let cookies = (session.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]).join('; ');
  await session.text();

  const search = await postForm(
    '/ConsultaIndividual/BuscaSerie',
    { TipoDeConsulta: 'SerieUnica', Rgd: 'IMPR', rgninicial: '160', rgnfinal: '160' },
    cookies,
  );

  const candidates = parseBuscaSerieHtml(search.html);
  const c = candidates[0];
  if (!c) {
    console.log('FALHA: sem candidato');
    process.exit(1);
  }

  console.log('permiteConsulta:', c.permiteConsulta, 'allowsDetail:', c.allowsDetail);
  if (!c.allowsDetail) {
    console.log('FALHA: allowsDetail deveria ser true para P');
    process.exit(1);
  }
  console.log('OK parser — IMPR 160 permite consulta parcial (P)');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
