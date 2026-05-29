import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { parseBulaBuyerListText, detectBuyerListFormat } from './bula-buyer-list-parser.util';

const SAMPLE_BLOCK = `
RELAÇÃO DE COMPRADORES
21/05/2026 - 20:00h a 21/05/2026 - 00:00h
BULA REMATES
3° LEILÃO VIRTUAL TOUROS NELORE TRESMAR
CAMPO GRANDE - MS
NOME 	CPF/CNPJ
ENDEREÇO
FAZENDA 	Inscrição / Estabelecimento
UF - MUNICÍPIO 	CEP
UF - MUNICÍPIO
FONE COM 1 	FONE COM 2 	FONE COM 3 	FONE RES 	FAX 	CELULAR
CLIENTES - ELITE
ALUISIO DE FIGUEIREDO NETO
RUA KLAUS STUHRK 13 JARDIM MANSUR
039.850.441-55
(67)99936-5187
MS - CAMPO GRANDE 	79051-660
Fazenda Olaria
MS - RIO VERDE DE MATO GROSSO	28.847.047-8
ALUISIOFN@GMAIL.COM
ANDRE LUIS CAETANO ROSA
RUA TERESINHA 29 BELO HORIZONTE
374.243.352-00
(94)99973-3550
PA - MARABÁ 	68503-160
FAZENDA BELA VISTA 3 	PA - MARABÁ	SEM IE / 15042085227
alcr0104@gmail.com
BULA REMATES
Pág.: 1/3
`;

const TRESMAR_FIXTURE = readFileSync(
  new URL('./fixtures/tresmar-buyers.txt', import.meta.url),
  'utf8',
);

describe('bula-buyer-list-parser', () => {
  it('detects buyer list format', () => {
    assert.equal(detectBuyerListFormat(SAMPLE_BLOCK), true);
    assert.equal(detectBuyerListFormat('FATURA DE VENDA'), false);
  });

  it('parses buyer blocks from sample text', () => {
    const rows = parseBulaBuyerListText(SAMPLE_BLOCK);
    assert.ok(rows.length >= 2, `expected at least 2 buyers, got ${rows.length}`);

    const aluisio = rows.find((r) => r.name.includes('ALUISIO'));
    assert.ok(aluisio);
    assert.equal(aluisio!.document, '039.850.441-55');
    assert.equal(aluisio!.email, 'aluisiofn@gmail.com');
    assert.equal(aluisio!.phone, '(67)99936-5187');
    assert.equal(aluisio!.city, 'CAMPO GRANDE');
    assert.equal(aluisio!.state, 'MS');
    assert.equal(aluisio!.zipCode, '79051-660');
    assert.ok(aluisio!.ranchName?.toLowerCase().includes('olaria'));

    const andre = rows.find((r) => r.name.includes('ANDRE LUIS'));
    assert.ok(andre);
    assert.equal(andre!.document, '374.243.352-00');
    assert.equal(andre!.email, 'alcr0104@gmail.com');
  });

  it('parses full tresmar report without splitting buyers incorrectly', () => {
    const rows = parseBulaBuyerListText(TRESMAR_FIXTURE);
    assert.equal(rows.length, 23, `expected 23 buyers, got ${rows.length}: ${rows.map((r) => r.name).join(', ')}`);

    const carlos = rows.find((r) => r.name.includes('CARLOS NUNES'));
    assert.ok(carlos);
    assert.equal(carlos!.email, 'carlosneto@com4.com.br');
    assert.ok(carlos!.ranchRegistration?.includes('315280819120001'));

    const james = rows.find((r) => r.name.includes('JAMES'));
    assert.ok(james);
    assert.equal(james!.city, 'SÃO DOMINGOS DO MARANHÃO');
    assert.equal(james!.state, 'MA');
    assert.equal(james!.zipCode, '65790-000');
    assert.equal(james!.email, 'rejaniaalbuquerque77@hotmail.com');

    const mariano = rows.find((r) => r.name.includes('MARIANO CASAL'));
    assert.ok(mariano);
    assert.equal(mariano!.email, 'marianocregasso@hotmail.com');
    assert.ok(mariano!.address?.includes('END ROD MIRANDA'));

    const romualdo = rows.find((r) => r.name.includes('ROMUALDO'));
    assert.ok(romualdo);
    assert.equal(romualdo!.ranchName, 'CENTRAL BELA VISTA');
    assert.equal(romualdo!.email, 'romualdohenrique@hotmail.com');

    const salomao = rows.find((r) => r.name.includes('SALOMÃO'));
    assert.ok(salomao);
    assert.equal(salomao!.email, 'salper30@hotmail.com');
    assert.ok(salomao!.ranchName?.includes('PONTE DE TABUAS'));

    const evaldo = rows.find((r) => r.name.includes('EVALDO'));
    assert.ok(evaldo);
    assert.equal(evaldo!.zipCode, '79170-000');
    assert.equal(evaldo!.city, 'SIDROLÂNDIA');

    assert.ok(!rows.some((r) => r.name === 'MARANHÃO'));
    assert.ok(!rows.some((r) => r.name.startsWith('315')));
    assert.ok(!rows.some((r) => r.name.startsWith('END ROD')));
  });

  it('parses name and CPF on the same header line', () => {
    const block = `
RELAÇÃO DE COMPRADORES
BULA REMATES
CLIENTES - ELITE
ALUISIO DE FIGUEIREDO NETO 039.850.441-55
RUA KLAUS STUHRK 13 JARDIM MANSUR
(67)99936-5187
MS - CAMPO GRANDE 79051-660
Fazenda Olaria  MS - RIO VERDE DE MATO GROSSO 28.847.047-8
ALUISIOFN@GMAIL.COM
`;
    const rows = parseBulaBuyerListText(block);
    assert.equal(rows.length, 1);
    assert.equal(rows[0]!.name, 'ALUISIO DE FIGUEIREDO NETO');
    assert.equal(rows[0]!.document, '039.850.441-55');
  });
});
