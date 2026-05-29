import { readFileSync } from 'fs';
import { basename } from 'path';

const API = process.env.API_URL ?? 'http://localhost:4001/api/v1';
const FARM_ID = '00000000-0000-4000-8000-000000000001';
const EVENT_ID = '9c5d600e-7f0d-4721-9333-844b4b169189';
const PDF =
  'c:/Users/Matheus/Desktop/Geraldo de Souza Carvalho Junior - Virtual Fazenda São Lourenço_Venda - Mapa de Venda.pdf';

const login = await fetch(`${API}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'admin@controlefazendas.com', password: 'admin123' }),
}).then((r) => r.json());

const bytes = readFileSync(PDF);
const form = new FormData();
form.append('file', new Blob([bytes], { type: 'application/pdf' }), basename(PDF));
form.append('password', '5421');

const preview = await fetch(`${API}/farms/${FARM_ID}/events/${EVENT_ID}/import/preview`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${login.accessToken}` },
  body: form,
}).then((r) => r.json());

for (const lot of preview.lots.filter((l) => !l.isCashPayment).slice(0, 8)) {
  const sum = lot.installments.reduce((s, r) => s + r.amount, 0);
  const diff = Math.abs(sum - (lot.netAmount ?? 0));
  const entrada = lot.installments[0]?.amount ?? 0;
  console.log(
    `Lote ${lot.canal}: net=${lot.netAmount} sum=${sum.toFixed(2)} diff=${diff.toFixed(2)} entrada=${entrada} inst=${lot.installments.length}`,
  );
}
