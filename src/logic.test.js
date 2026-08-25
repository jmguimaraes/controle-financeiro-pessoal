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
  filtrarLancamentos,
  totalFiltrado,
  resumoUltimosMeses,
  gastosPorCategoria,
  gastoCategoriaUltimosMeses,
  statusMeta,
  estadoInicial,
  applyAction,
  posicaoAtivo,
  migrarInvestimentoLegado,
  resumoInvestimento,
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

test('filtrarLancamentos filtra por mês, tipo, conta e busca combinados', () => {
  const lancamentos = [
    { id: '1', data: '2026-08-05', descricao: 'Salário', categoria: 'Salário', tipo: 'receita', valorTotal: 4500, parcelas: 1, contaId: 'c1' },
    { id: '2', data: '2026-08-07', descricao: 'Aluguel', categoria: 'Moradia', tipo: 'despesa', valorTotal: 1200, parcelas: 1, contaId: 'c2' },
    { id: '3', data: '2026-08-10', descricao: 'Notebook', categoria: 'Outras Despesas', tipo: 'despesa', valorTotal: 3600, parcelas: 12, contaId: 'c1' },
    { id: '4', data: '2026-07-01', descricao: 'Fora do mês', categoria: 'Lazer', tipo: 'despesa', valorTotal: 50, parcelas: 1 },
  ];
  assert.deepEqual(
    filtrarLancamentos(lancamentos, 2026, 8, {}).map((l) => l.id),
    ['3', '2', '1']
  );
  assert.deepEqual(
    filtrarLancamentos(lancamentos, 2026, 8, { filtro: 'receitas' }).map((l) => l.id),
    ['1']
  );
  assert.deepEqual(
    filtrarLancamentos(lancamentos, 2026, 8, { filtro: 'parcelados' }).map((l) => l.id),
    ['3']
  );
  assert.deepEqual(
    filtrarLancamentos(lancamentos, 2026, 8, { contaId: 'c1' }).map((l) => l.id),
    ['3', '1']
  );
  assert.deepEqual(
    filtrarLancamentos(lancamentos, 2026, 8, { busca: 'alug' }).map((l) => l.id),
    ['2']
  );
});

test('totalFiltrado soma receitas e subtrai despesas dos itens já filtrados', () => {
  const itens = [
    { tipo: 'receita', valorTotal: 1000, parcelas: 1 },
    { tipo: 'despesa', valorTotal: 400, parcelas: 1 },
  ];
  assert.equal(totalFiltrado(itens), 600);
});

test('resumoUltimosMeses devolve o saldo dos últimos N meses, terminando no mês atual', () => {
  const lancamentos = [
    { id: '1', data: '2026-07-01', tipo: 'receita', valorTotal: 100, parcelas: 1 },
    { id: '2', data: '2026-08-01', tipo: 'receita', valorTotal: 200, parcelas: 1 },
  ];
  const serie = resumoUltimosMeses(lancamentos, 2026, 8, 3);
  assert.deepEqual(
    serie.map((p) => `${p.ano}-${p.mes}`),
    ['2026-6', '2026-7', '2026-8']
  );
  assert.equal(serie[1].saldo, 100);
  assert.equal(serie[2].saldo, 200);
});

test('resumoUltimosMeses atravessa a virada de ano corretamente', () => {
  const serie = resumoUltimosMeses([], 2026, 1, 3);
  assert.deepEqual(
    serie.map((p) => `${p.ano}-${p.mes}`),
    ['2025-11', '2025-12', '2026-1']
  );
});

test('gastosPorCategoria soma despesas do mês por categoria, ordenado do maior para o menor', () => {
  const lancamentos = [
    { id: '1', data: '2026-08-01', categoria: 'Moradia', tipo: 'despesa', valorTotal: 2200, parcelas: 1 },
    { id: '2', data: '2026-08-02', categoria: 'Alimentação', tipo: 'despesa', valorTotal: 300, parcelas: 1 },
    { id: '3', data: '2026-08-03', categoria: 'Alimentação', tipo: 'despesa', valorTotal: 200, parcelas: 1 },
    { id: '4', data: '2026-08-04', categoria: 'Salário', tipo: 'receita', valorTotal: 5000, parcelas: 1 },
  ];
  assert.deepEqual(gastosPorCategoria(lancamentos, 2026, 8), [
    { categoria: 'Moradia', valor: 2200 },
    { categoria: 'Alimentação', valor: 500 },
  ]);
});

test('gastoCategoriaUltimosMeses devolve zero nos meses sem gasto na categoria', () => {
  const lancamentos = [{ id: '1', data: '2026-08-01', categoria: 'Lazer', tipo: 'despesa', valorTotal: 100, parcelas: 1 }];
  const serie = gastoCategoriaUltimosMeses(lancamentos, 'Lazer', 2026, 8, 2);
  assert.deepEqual(serie.map((p) => p.valor), [0, 100]);
});

test('statusMeta indica excedente quando o gasto passa do limite', () => {
  assert.deepEqual(statusMeta(400, 500), { percentual: 80, excedeu: false, excedente: 0 });
  assert.deepEqual(statusMeta(640, 500), { percentual: 128, excedeu: true, excedente: 140 });
  assert.deepEqual(statusMeta(100, 0), { percentual: 0, excedeu: false, excedente: 0 });
});

test('estadoInicial começa com listas vazias, tema escuro e valores visíveis', () => {
  const estado = estadoInicial();
  assert.deepEqual(estado.lancamentos, []);
  assert.deepEqual(estado.investimentos, []);
  assert.deepEqual(estado.contas, []);
  assert.deepEqual(estado.metas, []);
  assert.equal(estado.tema, 'escuro');
  assert.equal(estado.ocultarValores, false);
});

test('applyAction addLancamento acrescenta sem mutar o estado original', () => {
  const estadoOriginal = estadoInicial();
  const novo = applyAction(estadoOriginal, {
    type: 'addLancamento',
    lancamento: { id: 'a1', data: '2026-08-01', tipo: 'despesa', categoria: 'Lazer', valorTotal: 50, parcelas: 1 },
  });
  assert.equal(estadoOriginal.lancamentos.length, 0);
  assert.equal(novo.lancamentos.length, 1);
  assert.equal(novo.lancamentos[0].id, 'a1');
});

test('applyAction editLancamento altera só o item com o id informado', () => {
  const estado = {
    lancamentos: [{ id: 'a1', valorTotal: 50 }, { id: 'a2', valorTotal: 100 }],
    investimentos: [],
  };
  const novo = applyAction(estado, { type: 'editLancamento', id: 'a2', changes: { valorTotal: 999 } });
  assert.equal(novo.lancamentos.find((l) => l.id === 'a1').valorTotal, 50);
  assert.equal(novo.lancamentos.find((l) => l.id === 'a2').valorTotal, 999);
});

test('applyAction deleteLancamento remove só o item com o id informado', () => {
  const estado = { lancamentos: [{ id: 'a1' }, { id: 'a2' }], investimentos: [] };
  const novo = applyAction(estado, { type: 'deleteLancamento', id: 'a1' });
  assert.deepEqual(novo.lancamentos.map((l) => l.id), ['a2']);
});

test('applyAction reaplica a mesma ação de add em cima de um estado mais novo (simula retry após conflito)', () => {
  // Estado A: o que este dispositivo tinha quando começou a ação.
  const acao = {
    type: 'addLancamento',
    lancamento: { id: 'novo-id-gerado-uma-vez', valorTotal: 10, parcelas: 1 },
  };
  // Estado B: enquanto isso, outro dispositivo publicou e o estado real já mudou.
  const estadoB = { lancamentos: [{ id: 'existente' }, { id: 'de-outro-dispositivo' }], investimentos: [] };
  // O retry reaplica a MESMA ação (mesmo id) em cima do estado B, não do A.
  const resultado = applyAction(estadoB, acao);
  assert.deepEqual(
    resultado.lancamentos.map((l) => l.id),
    ['existente', 'de-outro-dispositivo', 'novo-id-gerado-uma-vez']
  );
});

test('applyAction addInvestimento, editInvestimento e deleteInvestimento funcionam por id', () => {
  let estado = estadoInicial();
  estado = applyAction(estado, { type: 'addInvestimento', investimento: { id: 'i1', valorAtual: 100 } });
  estado = applyAction(estado, { type: 'editInvestimento', id: 'i1', changes: { valorAtual: 150 } });
  assert.equal(estado.investimentos[0].valorAtual, 150);
  estado = applyAction(estado, { type: 'deleteInvestimento', id: 'i1' });
  assert.equal(estado.investimentos.length, 0);
});

test('applyAction addConta, editConta e deleteConta funcionam por id', () => {
  let estado = estadoInicial();
  estado = applyAction(estado, { type: 'addConta', conta: { id: 'c1', nome: 'Nubank', tipo: 'cartao' } });
  estado = applyAction(estado, { type: 'editConta', id: 'c1', changes: { nome: 'Nubank Ultravioleta' } });
  assert.equal(estado.contas[0].nome, 'Nubank Ultravioleta');
  estado = applyAction(estado, { type: 'deleteConta', id: 'c1' });
  assert.equal(estado.contas.length, 0);
});

test('applyAction addMeta, editMeta e deleteMeta funcionam por id', () => {
  let estado = estadoInicial();
  estado = applyAction(estado, { type: 'addMeta', meta: { id: 'm1', categoria: 'Lazer', limite: 600 } });
  estado = applyAction(estado, { type: 'editMeta', id: 'm1', changes: { limite: 700 } });
  assert.equal(estado.metas[0].limite, 700);
  estado = applyAction(estado, { type: 'deleteMeta', id: 'm1' });
  assert.equal(estado.metas.length, 0);
});

test('applyAction setTema e setOcultarValores alteram as preferências persistidas', () => {
  let estado = estadoInicial();
  estado = applyAction(estado, { type: 'setTema', tema: 'claro' });
  assert.equal(estado.tema, 'claro');
  estado = applyAction(estado, { type: 'setOcultarValores', valor: true });
  assert.equal(estado.ocultarValores, true);
});

test('posicaoAtivo calcula preço médio ponderado a partir de várias compras', () => {
  const operacoes = [
    { tipo: 'compra', data: '2026-01-10', quantidade: 10, precoUnitario: 20 },
    { tipo: 'compra', data: '2026-02-10', quantidade: 10, precoUnitario: 30 },
  ];
  const posicao = posicaoAtivo(operacoes);
  assert.equal(posicao.quantidade, 20);
  assert.equal(posicao.precoMedio, 25);
});

test('posicaoAtivo reduz a quantidade numa venda sem alterar o preço médio', () => {
  const operacoes = [
    { tipo: 'compra', data: '2026-01-10', quantidade: 10, precoUnitario: 20 },
    { tipo: 'venda', data: '2026-03-10', quantidade: 4, precoUnitario: 50 },
  ];
  const posicao = posicaoAtivo(operacoes);
  assert.equal(posicao.quantidade, 6);
  assert.equal(posicao.precoMedio, 20);
});

test('posicaoAtivo processa as operações em ordem cronológica, não na ordem da lista', () => {
  const operacoes = [
    { tipo: 'venda', data: '2026-03-10', quantidade: 4, precoUnitario: 50 },
    { tipo: 'compra', data: '2026-01-10', quantidade: 10, precoUnitario: 20 },
  ];
  const posicao = posicaoAtivo(operacoes);
  assert.equal(posicao.quantidade, 6);
});

test('posicaoAtivo rejeita venda que excede a posição atual', () => {
  const operacoes = [
    { tipo: 'compra', data: '2026-01-10', quantidade: 5, precoUnitario: 20 },
    { tipo: 'venda', data: '2026-02-10', quantidade: 10, precoUnitario: 30 },
  ];
  assert.throws(() => posicaoAtivo(operacoes), /excede/);
});

test('posicaoAtivo devolve zeros para uma lista de operações vazia', () => {
  assert.deepEqual(posicaoAtivo([]), { quantidade: 0, precoMedio: 0, custoTotal: 0 });
});

test('migrarInvestimentoLegado converte valorInvestido/valorAtual antigos numa 1ª operação de compra sintética', () => {
  const legado = { id: 'i1', nome: 'PETR4', tipo: 'acao', valorInvestido: 1000, valorAtual: 1200, atualizadoEm: '2026-05-01' };
  const migrado = migrarInvestimentoLegado(legado);
  assert.equal(migrado.operacoes.length, 1);
  assert.equal(migrado.operacoes[0].tipo, 'compra');
  assert.equal(migrado.operacoes[0].quantidade, 1);
  assert.equal(migrado.operacoes[0].precoUnitario, 1000);
  assert.equal(migrado.operacoes[0].data, '2026-05-01');
  assert.equal(migrado.precoAtual, 1200);
  assert.equal(migrado.id, 'i1');
});

test('migrarInvestimentoLegado não mexe num investimento que já tem operações', () => {
  const jaMigrado = { id: 'i1', operacoes: [{ tipo: 'compra', data: '2026-01-01', quantidade: 2, precoUnitario: 10 }], precoAtual: 15 };
  assert.deepEqual(migrarInvestimentoLegado(jaMigrado), jaMigrado);
});

test('resumoInvestimento deriva quantidade, preço médio, valor investido/atual e rendimento a partir das operações', () => {
  const investimento = {
    id: 'i1',
    precoAtual: 30,
    operacoes: [
      { tipo: 'compra', data: '2026-01-10', quantidade: 10, precoUnitario: 20 },
      { tipo: 'compra', data: '2026-02-10', quantidade: 10, precoUnitario: 30 },
    ],
  };
  const resumo = resumoInvestimento(investimento);
  assert.equal(resumo.quantidade, 20);
  assert.equal(resumo.precoMedio, 25);
  assert.equal(resumo.valorInvestido, 500);
  assert.equal(resumo.valorAtual, 600);
  assert.equal(resumo.rendimentoValor, 100);
});

test('resumoInvestimento migra investimentos legados automaticamente', () => {
  const legado = { id: 'i1', valorInvestido: 1000, valorAtual: 1200 };
  const resumo = resumoInvestimento(legado);
  assert.equal(resumo.quantidade, 1);
  assert.equal(resumo.valorInvestido, 1000);
  assert.equal(resumo.valorAtual, 1200);
});

test('applyAction preserva contas e metas existentes ao aplicar uma ação não relacionada', () => {
  const estado = {
    lancamentos: [],
    investimentos: [],
    contas: [{ id: 'c1', nome: 'Itaú' }],
    metas: [{ id: 'm1', categoria: 'Lazer', limite: 500 }],
    tema: 'claro',
    ocultarValores: true,
  };
  const novo = applyAction(estado, { type: 'addInvestimento', investimento: { id: 'i1', valorAtual: 10, valorInvestido: 10 } });
  assert.deepEqual(novo.contas, [{ id: 'c1', nome: 'Itaú' }]);
  assert.deepEqual(novo.metas, [{ id: 'm1', categoria: 'Lazer', limite: 500 }]);
  assert.equal(novo.tema, 'claro');
  assert.equal(novo.ocultarValores, true);
});
