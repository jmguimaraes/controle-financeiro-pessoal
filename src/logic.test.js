const test = require('node:test');
const assert = require('node:assert/strict');
const {
  uid,
  parcelaValor,
  parcelaNoMes,
  resumoMensal,
  parcelasEmAberto,
  rendimento,
  totalCarteira,
} = require('./logic.js');

test('parcelaValor divide o valor total pelo número de parcelas', () => {
  assert.equal(parcelaValor({ valorTotal: 3600, parcelas: 12 }), 300);
});

test('parcelaValor trata lançamento sem parcelas como parcela única', () => {
  assert.equal(parcelaValor({ valorTotal: 1200 }), 1200);
});

test('parcelaNoMes identifica a parcela correta dentro do intervalo', () => {
  const lanc = { data: '2026-08-10', parcelas: 12 };
  assert.deepEqual(parcelaNoMes(lanc, 2026, 8), { noMes: true, numeroParcela: 1 });
  assert.deepEqual(parcelaNoMes(lanc, 2026, 9), { noMes: true, numeroParcela: 2 });
  assert.deepEqual(parcelaNoMes(lanc, 2027, 7), { noMes: true, numeroParcela: 12 });
});

test('parcelaNoMes retorna false fora do intervalo de parcelas', () => {
  const lanc = { data: '2026-08-10', parcelas: 12 };
  assert.deepEqual(parcelaNoMes(lanc, 2026, 7), { noMes: false, numeroParcela: null });
  assert.deepEqual(parcelaNoMes(lanc, 2027, 8), { noMes: false, numeroParcela: null });
});

test('resumoMensal soma receitas e despesas do mês, incluindo parcelas', () => {
  const lancamentos = [
    { id: '1', data: '2026-08-05', tipo: 'receita', valorTotal: 4500, parcelas: 1 },
    { id: '2', data: '2026-08-07', tipo: 'despesa', valorTotal: 1200, parcelas: 1 },
    { id: '3', data: '2026-08-10', tipo: 'despesa', valorTotal: 3600, parcelas: 12 },
  ];
  const resumo = resumoMensal(lancamentos, 2026, 8);
  assert.equal(resumo.receitas, 4500);
  assert.equal(resumo.despesas, 1500);
  assert.equal(resumo.saldo, 3000);
});

test('resumoMensal ignora lançamentos fora do mês alvo', () => {
  const lancamentos = [{ id: '1', data: '2026-01-01', tipo: 'receita', valorTotal: 100, parcelas: 1 }];
  const resumo = resumoMensal(lancamentos, 2026, 8);
  assert.equal(resumo.receitas, 0);
});

test('parcelasEmAberto lista compras parceladas ativas no mês, com parcelas restantes', () => {
  const lancamentos = [
    { id: '1', data: '2026-08-10', descricao: 'Notebook', tipo: 'despesa', valorTotal: 3600, parcelas: 12 },
    { id: '2', data: '2026-08-10', descricao: 'Mercado', tipo: 'despesa', valorTotal: 500, parcelas: 1 },
  ];
  const abertas = parcelasEmAberto(lancamentos, 2026, 9);
  assert.equal(abertas.length, 1);
  assert.equal(abertas[0].id, '1');
  assert.equal(abertas[0].numeroParcela, 2);
  assert.equal(abertas[0].restantes, 10);
});

test('uid gera identificadores não vazios e diferentes entre si', () => {
  const a = uid();
  const b = uid();
  assert.ok(a.length > 0);
  assert.notEqual(a, b);
});

test('rendimento calcula valor e percentual de ganho/perda', () => {
  assert.deepEqual(rendimento(2000, 2150), { valor: 150, percentual: 7.5 });
  assert.deepEqual(rendimento(0, 0), { valor: 0, percentual: 0 });
});

test('totalCarteira soma investido/atual e calcula rendimento agregado', () => {
  const investimentos = [
    { valorInvestido: 2000, valorAtual: 2150 },
    { valorInvestido: 1000, valorAtual: 900 },
  ];
  const total = totalCarteira(investimentos);
  assert.equal(total.totalInvestido, 3000);
  assert.equal(total.totalAtual, 3050);
  assert.equal(total.rendimentoValor, 50);
});
