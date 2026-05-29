import { readFileSync } from 'fs';
import { basename } from 'path';

const API = process.env.API_URL ?? 'http://localhost:4001/api/v1';
const FARM_ID = '00000000-0000-4000-8000-000000000001';
const PASSWORD = '5421';
const BATCH = 10;

const jobs = [
  {
    eventId: '9c5d600e-7f0d-4721-9333-844b4b169189',
    pdf: 'c:/Users/Matheus/Desktop/Geraldo de Souza Carvalho Junior - Virtual Fazenda São Lourenço_Venda - Mapa de Venda.pdf',
  },
  {
    eventId: '79f3da53-93c4-414e-85ca-f460fefff2c4',
    pdf: 'c:/Users/Matheus/Desktop/Mapa Leilão Geraçao Premiun - 03.11.2024.pdf',
  },
  {
    eventId: 'b6c6ca7a-4b24-421e-9512-25fd80b8f827',
    pdf: 'c:/Users/Matheus/Desktop/Geraldo de Souza Carvalho Junior - Virtual Fazenda São Lourenço_Venda - Mapa de Venda.pdf',
  },
];

async function login() {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@controlefazendas.com', password: 'admin123' }),
  });
  if (!res.ok) throw new Error(`Login failed: ${res.status}`);
  const data = await res.json();
  return data.accessToken;
}

async function preview(token, eventId, pdfPath) {
  const bytes = readFileSync(pdfPath);
  const form = new FormData();
  form.append('file', new Blob([bytes], { type: 'application/pdf' }), basename(pdfPath));
  form.append('password', PASSWORD);

  const res = await fetch(`${API}/farms/${FARM_ID}/events/${eventId}/import/preview`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!res.ok) {
    throw new Error(`Preview failed (${eventId}): ${res.status} ${await res.text()}`);
  }
  return res.json();
}

function mapLot(lot) {
  return {
    tempId: lot.tempId,
    selected: true,
    canal: lot.canal,
    description: lot.description,
    registration: lot.registration,
    animalId: lot.animalId,
    createAnimal: lot.createAnimal,
    buyerName: lot.buyerName,
    buyerPartnerId: lot.buyerPartnerId,
    createBuyer: lot.createBuyer,
    bidValue: lot.bidValue ?? undefined,
    captures: lot.captures,
    quantity: lot.quantity,
    totalAmount: lot.totalAmount ?? undefined,
    netAmount: lot.netAmount ?? undefined,
    discountAmount: lot.discountAmount ?? undefined,
    entryAmount: lot.entryAmount ?? undefined,
    isCashPayment: lot.isCashPayment,
    installments: lot.installments,
  };
}

async function syncBatch(token, eventId, lots, transactionDate) {
  const res = await fetch(`${API}/farms/${FARM_ID}/events/${eventId}/import/sync-installments`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ transactionDate, lots }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Sync failed (${eventId}): ${res.status} ${body}`);
  }
  return res.json();
}

async function runJob(token, job) {
  console.log(`\n=== ${job.eventId} ===`);
  const previewData = await preview(token, job.eventId, job.pdf);
  const lots = previewData.lots.filter((lot) => !lot.isCashPayment).map(mapLot);
  console.log(`Preview lots (parcelado): ${lots.length}`);

  const aggregated = { synced: 0, skipped: 0, alreadyHasPlan: 0, warnings: [] };
  for (let i = 0; i < lots.length; i += BATCH) {
    const chunk = lots.slice(i, i + BATCH);
    const result = await syncBatch(
      token,
      job.eventId,
      chunk,
      previewData.document.eventDate ?? undefined,
    );
    aggregated.synced += result.synced;
    aggregated.skipped += result.skipped;
    aggregated.alreadyHasPlan += result.alreadyHasPlan;
    aggregated.warnings.push(...result.warnings);
    console.log(`Batch ${i / BATCH + 1}: synced=${result.synced} skipped=${result.skipped}`);
  }

  console.log('Total:', aggregated);
  if (aggregated.warnings.length > 0) {
    console.log('Warnings sample:', aggregated.warnings.slice(0, 5));
  }
}

const token = await login();
for (const job of jobs) {
  await runJob(token, job);
}

const countRes = await fetch(`${API}/farms/${FARM_ID}/installments/summary`, {
  headers: { Authorization: `Bearer ${token}` },
});
console.log('\nSummary after backfill:', await countRes.json());
