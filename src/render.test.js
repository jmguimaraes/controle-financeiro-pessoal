const test = require('node:test');
const assert = require('node:assert/strict');
const { formatCurrency, formatPercent, renderResumo, renderLancamentos, renderInvestimentos } = require('./render.js');

test('formatCurrency formata em reais no padrão pt-BR', () => {
  assert.equal(formatCurrency(1234.5), 'R$ 1.234,50');
});

test('formatPercent formata com sinal e vírgula decimal', () => {
  assert.equal(formatPercent(7.5), '+7,50%');
  assert.equal(formatPercent(-5), '-5,00%');
});

test('renderResumo mostra receitas, despesas e saldo do mês', () => {
  const state = {
    lancamentos: [
      { id: '1', data: '2026-08-05', tipo: 'receita', categoria: 'Salário', descricao: 'Salário', valorTotal: 4500, parcelas: 1 },
      { id: '2', data: '2026-08-07', tipo: 'despesa', categoria: 'Moradia', descricao: 'Aluguel', valorTotal: 1200, parcelas: 1 },
    ],
    investimentos: [],
  };
  const html = renderResumo(state, 2026, 8);
  assert.match(html, /Agosto de 2026/);
  assert.match(html, /R\$ 4\.500,00/);
  assert.match(html, /R\$ 1\.200,00/);
});

test('renderResumo lista parcelas em aberto do mês', () => {
  const state = {
    lancamentos: [
      { id: '1', data: '2026-08-10', descricao: 'Notebook', tipo: 'despesa', categoria: 'Outras Despesas', valorTotal: 3600, parcelas: 12 },
    ],
    investimentos: [],
  };
  const html = renderResumo(state, 2026, 9);
  assert.match(html, /Notebook/);
  assert.match(html, /parcela 2\/12/);
});

test('renderLancamentos mostra "nenhum lançamento" quando a lista do mês está vazia', () => {
  const html = renderLancamentos({ lancamentos: [], investimentos: [] }, 2026, 8);
  assert.match(html, /Nenhum lançamento neste mês/);
});

test('renderLancamentos escapa HTML da descrição para evitar injeção', () => {
  const state = {
    lancamentos: [
      { id: '1', data: '2026-08-01', descricao: '<script>alert(1)</script>', tipo: 'despesa', categoria: 'Lazer', valorTotal: 10, parcelas: 1 },
    ],
    investimentos: [],
  };
  const html = renderLancamentos(state, 2026, 8);
  assert.equal(html.includes('<script>alert'), false);
  assert.match(html, /&lt;script&gt;/);
});

test('renderLancamentos mostra a tag de parcela quando o lançamento é parcelado', () => {
  const state = {
    lancamentos: [
      { id: '1', data: '2026-08-10', descricao: 'Notebook', tipo: 'despesa', categoria: 'Outras Despesas', valorTotal: 3600, parcelas: 12 },
    ],
    investimentos: [],
  };
  const html = renderLancamentos(state, 2026, 9);
  assert.match(html, /parcela 2\/12/);
});

test('renderInvestimentos mostra rendimento positivo e negativo, com rótulo de tipo legível', () => {
  const state = {
    lancamentos: [],
    investimentos: [
      { id: '1', nome: 'ITSA4', tipo: 'acao', valorInvestido: 2000, valorAtual: 2150 },
      { id: '2', nome: 'Tesouro', tipo: 'renda_fixa', valorInvestido: 1000, valorAtual: 950 },
    ],
  };
  const html = renderInvestimentos(state);
  assert.match(html, /ITSA4/);
  assert.match(html, /Ação/);
  assert.match(html, /\+7,50%/);
  assert.match(html, /Tesouro/);
  assert.match(html, /-5,00%/);
});

test('renderInvestimentos mostra mensagem quando não há investimentos', () => {
  const html = renderInvestimentos({ lancamentos: [], investimentos: [] });
  assert.match(html, /Nenhum investimento cadastrado/);
});
