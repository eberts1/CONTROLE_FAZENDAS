/**
 * Diagnóstico IMPR 160 — node apps/api/scripts/test-abcz-impr160.mjs
 */
import * as cheerio from 'cheerio';

const BASE = process.env.ABCZ_BASE_URL ?? 'https://zebu.org.br';

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

async function postJson(path, payload, cookies) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      Cookie: cookies ?? '',
      'User-Agent': 'ControleFazendas-Test/1.0',
    },
    body: JSON.stringify(payload),
  });
  const setCookie = res.headers.getSetCookie?.() ?? [];
  const merged = [...(cookies ? [cookies] : []), ...setCookie.map((c) => c.split(';')[0])]
    .filter(Boolean)
    .join('; ');
  return { text: await res.text(), cookies: merged };
}

function countGenealogyLabels(html) {
  const $ = cheerio.load(html);
  const tableRows = $('table.tablePadraoGenealogia tbody tr').length;
  const labels = $('label.labelNomeDoAnimal').length;
  return { tableRows, labels };
}

async function main() {
  const session = await fetch(`${BASE}/ConsultaIndividual`, {
    headers: { 'User-Agent': 'ControleFazendas-Test/1.0' },
  });
  let cookies = (session.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]).join('; ');
  await session.text();

  const search = await postForm(
    '/ConsultaIndividual/BuscaSerie',
    {
      TipoDeConsulta: 'SerieUnica',
      Rgd: 'IMPR',
      rgninicial: '160',
      rgnfinal: '160',
    },
    cookies,
  );
  cookies = search.cookies;

  const $ = cheerio.load(search.html);
  const $anchor = $('tr[title^="Clique"] td[data-idAnimal]').first();
  if (!$anchor.length) {
    console.log('FALHA: animal não encontrado na busca');
    process.exit(1);
  }

  const params = {
    Ordem: $anchor.attr('data-idanimal') ?? $anchor.attr('data-idAnimal'),
    Raca: $anchor.attr('data-raca'),
    Categoria: $anchor.attr('data-categoria'),
    Sexo: ($anchor.attr('data-sexo') ?? '').toLowerCase().includes('macho') ? 'Macho' : 'Femea',
    Serie: $anchor.attr('data-serie'),
    Rgn: $anchor.attr('data-rgn'),
    Rgd: $anchor.attr('data-rgd'),
    Proprietario: $anchor.attr('data-proprietario'),
    PermiteConsulta: $anchor.attr('data-permiteconsulta') ?? $anchor.attr('data-PermiteConsulta') ?? 'S',
  };

  console.log('Candidato:', params.Ordem, params.Serie, params.Rgn, 'PermiteConsulta:', params.PermiteConsulta);

  const permsRes = await postJson('/ConsultaIndividual/BuscaDetalhesDoAnimal', params, cookies);
  cookies = permsRes.cookies;
  const permissions = permsRes.text.replace(/^"|"$/g, '');
  console.log('Permissions:', permissions);
  const parts = permissions.split(';');
  console.log('  genealogia[1]:', parts[1], 'reprod[2]:', parts[2], 'genetica[3]:', parts[3]);

  const gen = await postForm('/ConsultaIndividual/PreencheGenealogiaDoAnimal', params, cookies);
  const counts = countGenealogyLabels(gen.html);
  console.log('Genealogia HTML:', counts);
  console.log('  contém tablePadraoGenealogia:', gen.html.includes('tablePadraoGenealogia'));
  console.log('  contém labelNomeDoAnimal:', gen.html.includes('labelNomeDoAnimal'));
  if (counts.labels === 0 && counts.tableRows === 0) {
    console.log('  amostra HTML:', gen.html.slice(0, 800));
  } else {
    const $g = cheerio.load(gen.html);
    $g('label.labelNomeDoAnimal')
      .slice(0, 5)
      .each((i, el) => {
        console.log(`  [${i}]`, $g(el).text().replace(/\s+/g, ' ').trim());
      });
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
