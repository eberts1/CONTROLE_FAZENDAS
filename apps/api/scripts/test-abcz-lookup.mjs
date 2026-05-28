/**
 * Teste rápido: node apps/api/scripts/test-abcz-lookup.mjs
 */
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

async function main() {
  const session = await fetch(`${BASE}/ConsultaIndividual`, {
    headers: { 'User-Agent': 'ControleFazendas-Test/1.0' },
  });
  let cookies = (session.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]).join('; ');
  await session.text();

  const { html } = await postForm(
    '/ConsultaIndividual/BuscaSerie',
    {
      TipoDeConsulta: 'SerieUnica',
      Rgd: 'GSCA',
      rgninicial: '1000',
      rgnfinal: '1000',
    },
    cookies,
  );

  const hasTable = html.includes('data-idAnimal') && html.includes('MIL FIV');
  console.log(hasTable ? 'OK GSCA 1000 encontrado' : 'FALHA');
  if (!hasTable) {
    console.log(html.slice(0, 500));
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
