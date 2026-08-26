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
  composicaoPorTipo,
  sugestaoAporte,
  totalProventos,
  historicoRealizado,
  impostoEstimadoMes,
  hashSimples,
  listaSugeridaPorTipo,
  jurosCompostos,
  jurosSimples,
  percentualDeValor,
  valorEQuePercentualDoTotal,
  aplicarVariacaoPercentual,
  mesesParaAtingirMeta,
  aporteNecessarioParaMeta,
  proximosDividendosPrevistos,
  iniciaisAtivo,
  corIndiceAtivo,
  numeroDecimalFlexivel,
  PERGUNTAS_PERFIL,
  perfilDeInvestidor,
  alocacaoSugeridaPorPerfil,
  TIPOS_ALOCACAO,
} = require('./logic.js');

const arred = (x) => Math.round(x * 100) / 100;

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

test('estadoInicial começa com listas vazias, tema escuro, valores visíveis, sem alocação-alvo e idioma português', () => {
  const estado = estadoInicial();
  assert.deepEqual(estado.lancamentos, []);
  assert.deepEqual(estado.investimentos, []);
  assert.deepEqual(estado.contas, []);
  assert.deepEqual(estado.metas, []);
  assert.equal(estado.tema, 'escuro');
  assert.equal(estado.ocultarValores, false);
  assert.equal(estado.alocacaoAlvo, null);
  assert.equal(estado.idioma, 'pt');
});

test('applyAction setIdioma altera o idioma persistido', () => {
  let estado = estadoInicial();
  estado = applyAction(estado, { type: 'setIdioma', idioma: 'en' });
  assert.equal(estado.idioma, 'en');
});

test('applyAction setAlocacaoAlvo grava as metas de % por tipo de ativo', () => {
  let estado = estadoInicial();
  estado = applyAction(estado, { type: 'setAlocacaoAlvo', alocacaoAlvo: { acao: 60, fii: 40 } });
  assert.deepEqual(estado.alocacaoAlvo, { acao: 60, fii: 40 });
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

test('composicaoPorTipo soma o valor atual dos ativos agrupado por tipo, ordenado do maior para o menor', () => {
  const investimentos = [
    { id: '1', tipo: 'acao', precoAtual: 10, operacoes: [{ tipo: 'compra', data: '2026-01-01', quantidade: 10, precoUnitario: 10 }] },
    { id: '2', tipo: 'fii', precoAtual: 5, operacoes: [{ tipo: 'compra', data: '2026-01-01', quantidade: 100, precoUnitario: 5 }] },
    { id: '3', tipo: 'acao', precoAtual: 20, operacoes: [{ tipo: 'compra', data: '2026-01-01', quantidade: 5, precoUnitario: 20 }] },
  ];
  assert.deepEqual(composicaoPorTipo(investimentos), [
    { tipo: 'fii', valor: 500 },
    { tipo: 'acao', valor: 200 },
  ]);
});

test('sugestaoAporte devolve vazio quando não há alocação-alvo definida', () => {
  assert.deepEqual(sugestaoAporte([], null), []);
});

test('sugestaoAporte ordena os tipos do maior déficit pro menor em relação à meta', () => {
  const investimentos = [
    { id: '1', tipo: 'acao', precoAtual: 10, operacoes: [{ tipo: 'compra', data: '2026-01-01', quantidade: 80, precoUnitario: 10 }] }, // 800
    { id: '2', tipo: 'fii', precoAtual: 10, operacoes: [{ tipo: 'compra', data: '2026-01-01', quantidade: 20, precoUnitario: 10 }] }, // 200
  ];
  // total = 1000; alvo 50/50 -> ideal 500 cada; ação está 300 acima (déficit -300), fii está 300 abaixo (déficit +300)
  const sugestao = sugestaoAporte(investimentos, { acao: 50, fii: 50 });
  assert.equal(sugestao[0].tipo, 'fii');
  assert.equal(sugestao[0].diferenca, 300);
  assert.equal(sugestao[1].tipo, 'acao');
  assert.equal(sugestao[1].diferenca, -300);
});

test('totalProventos soma o valor recebido em dividendos e JCP', () => {
  assert.equal(totalProventos([{ valor: 10.5 }, { valor: 5 }]), 15.5);
  assert.equal(totalProventos([]), 0);
  assert.equal(totalProventos(undefined), 0);
});

test('historicoRealizado calcula o lucro de cada venda em relação ao preço médio no momento', () => {
  const operacoes = [
    { id: 'c1', tipo: 'compra', data: '2026-01-10', quantidade: 10, precoUnitario: 20 },
    { id: 'v1', tipo: 'venda', data: '2026-03-10', quantidade: 4, precoUnitario: 30 },
  ];
  const vendas = historicoRealizado(operacoes);
  assert.equal(vendas.length, 1);
  assert.equal(vendas[0].quantidade, 4);
  assert.equal(vendas[0].precoMedioNaVenda, 20);
  assert.equal(vendas[0].valorVendido, 120);
  assert.equal(vendas[0].lucro, 40);
});

test('historicoRealizado devolve lista vazia quando não há vendas', () => {
  assert.deepEqual(historicoRealizado([{ id: 'c1', tipo: 'compra', data: '2026-01-10', quantidade: 10, precoUnitario: 20 }]), []);
});

test('impostoEstimadoMes isenta ações quando o total vendido no mês não passa de R$20.000', () => {
  const investimentos = [
    {
      id: '1',
      tipo: 'acao',
      precoAtual: 25,
      operacoes: [
        { tipo: 'compra', data: '2026-01-01', quantidade: 100, precoUnitario: 100 },
        { tipo: 'venda', data: '2026-03-05', quantidade: 100, precoUnitario: 150 }, // vendeu 15.000, lucro 5.000
      ],
    },
  ];
  const resultado = impostoEstimadoMes(investimentos, 2026, 3);
  assert.equal(resultado.length, 1);
  assert.equal(resultado[0].isento, true);
  assert.equal(resultado[0].impostoEstimado, 0);
});

test('impostoEstimadoMes tributa ações em 15% do lucro do mês quando as vendas passam de R$20.000', () => {
  const investimentos = [
    {
      id: '1',
      tipo: 'acao',
      precoAtual: 25,
      operacoes: [
        { tipo: 'compra', data: '2026-01-01', quantidade: 200, precoUnitario: 100 },
        { tipo: 'venda', data: '2026-03-05', quantidade: 200, precoUnitario: 150 }, // vendeu 30.000, lucro 10.000
      ],
    },
  ];
  const resultado = impostoEstimadoMes(investimentos, 2026, 3);
  assert.equal(resultado[0].isento, false);
  assert.equal(resultado[0].lucroTributavel, 10000);
  assert.equal(resultado[0].impostoEstimado, 1500);
});

test('impostoEstimadoMes tributa FIIs em 20% do lucro do mês sem nenhuma isenção por valor vendido', () => {
  const investimentos = [
    {
      id: '1',
      tipo: 'fii',
      precoAtual: 12,
      operacoes: [
        { tipo: 'compra', data: '2026-01-01', quantidade: 100, precoUnitario: 10 },
        { tipo: 'venda', data: '2026-03-05', quantidade: 100, precoUnitario: 12 }, // vendeu 1.200, lucro 200
      ],
    },
  ];
  const resultado = impostoEstimadoMes(investimentos, 2026, 3);
  assert.equal(resultado[0].isento, false);
  assert.equal(resultado[0].impostoEstimado, 40);
});

test('impostoEstimadoMes não tributa lucro líquido negativo no mês', () => {
  const investimentos = [
    {
      id: '1',
      tipo: 'fii',
      precoAtual: 8,
      operacoes: [
        { tipo: 'compra', data: '2026-01-01', quantidade: 100, precoUnitario: 10 },
        { tipo: 'venda', data: '2026-03-05', quantidade: 100, precoUnitario: 8 }, // prejuízo de 200
      ],
    },
  ];
  const resultado = impostoEstimadoMes(investimentos, 2026, 3);
  assert.equal(resultado[0].lucroTributavel, 0);
  assert.equal(resultado[0].impostoEstimado, 0);
});

test('impostoEstimadoMes ignora renda fixa/outro e meses sem vendas', () => {
  const investimentos = [
    { id: '1', tipo: 'renda_fixa', precoAtual: 100, operacoes: [{ tipo: 'compra', data: '2026-01-01', quantidade: 1, precoUnitario: 100 }, { tipo: 'venda', data: '2026-03-05', quantidade: 1, precoUnitario: 120 }] },
    { id: '2', tipo: 'acao', precoAtual: 10, operacoes: [{ tipo: 'compra', data: '2026-01-01', quantidade: 10, precoUnitario: 10 }] },
  ];
  assert.deepEqual(impostoEstimadoMes(investimentos, 2026, 3), []);
});

test('hashSimples devolve o mesmo hash pro mesmo texto', () => {
  assert.equal(hashSimples('1234'), hashSimples('1234'));
});

test('hashSimples devolve hashes diferentes pra PINs diferentes', () => {
  assert.notEqual(hashSimples('1234'), hashSimples('4321'));
  assert.notEqual(hashSimples('1234'), hashSimples('12345'));
});

test('hashSimples nunca devolve o texto original em claro', () => {
  assert.notEqual(hashSimples('1234'), '1234');
});

test('listaSugeridaPorTipo devolve os tickers sugeridos pra um tipo conhecido', () => {
  const lista = listaSugeridaPorTipo('acao');
  assert.ok(Array.isArray(lista));
  assert.ok(lista.length > 0);
  assert.ok(lista.includes('PETR4'));
});

test('listaSugeridaPorTipo devolve lista vazia pra um tipo desconhecido ou sem sugestões cadastradas', () => {
  assert.deepEqual(listaSugeridaPorTipo('tipo-que-nao-existe'), []);
  assert.deepEqual(listaSugeridaPorTipo('outro'), []);
});

test('listaSugeridaPorTipo tem sugestões pra fundo de investimento e renda fixa também, não só ação/FII', () => {
  assert.ok(listaSugeridaPorTipo('fundo_investimento').length > 0);
  assert.ok(listaSugeridaPorTipo('renda_fixa').includes('CDB'));
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

// --- Calculadoras ---

test('jurosCompostos calcula montante final com aporte mensal e juros mês a mês', () => {
  const r = jurosCompostos({ capitalInicial: 1000, aporteMensal: 100, taxaMensal: 0.01, meses: 2 });
  assert.equal(arred(r.montanteFinal), 1221.1);
  assert.equal(r.totalInvestido, 1200);
  assert.equal(arred(r.totalJuros), 21.1);
});

test('jurosCompostos sem taxa soma só capital inicial e aportes', () => {
  const r = jurosCompostos({ capitalInicial: 0, aporteMensal: 100, taxaMensal: 0, meses: 12 });
  assert.equal(r.montanteFinal, 1200);
  assert.equal(r.totalJuros, 0);
});

test('jurosCompostos com meses=0 retorna o capital inicial sem alteração', () => {
  const r = jurosCompostos({ capitalInicial: 500, aporteMensal: 100, taxaMensal: 0.02, meses: 0 });
  assert.equal(r.montanteFinal, 500);
  assert.equal(r.totalInvestido, 500);
  assert.equal(r.totalJuros, 0);
});

test('jurosSimples calcula montante linear sobre o capital inicial', () => {
  const r = jurosSimples({ capitalInicial: 1000, taxaMensal: 0.02, meses: 6 });
  assert.equal(arred(r.montanteFinal), 1120);
  assert.equal(arred(r.jurosTotal), 120);
});

test('jurosSimples com taxa zero retorna o capital inicial sem alteração', () => {
  const r = jurosSimples({ capitalInicial: 800, taxaMensal: 0, meses: 10 });
  assert.equal(r.montanteFinal, 800);
  assert.equal(r.jurosTotal, 0);
});

test('percentualDeValor calcula quanto é X% de um valor', () => {
  assert.equal(percentualDeValor(15, 200), 30);
});

test('valorEQuePercentualDoTotal calcula que percentual um valor representa do total', () => {
  assert.equal(valorEQuePercentualDoTotal(50, 200), 25);
});

test('valorEQuePercentualDoTotal retorna 0 quando o total é zero, em vez de dividir por zero', () => {
  assert.equal(valorEQuePercentualDoTotal(50, 0), 0);
});

test('aplicarVariacaoPercentual aumenta o valor com percentual positivo', () => {
  assert.equal(arred(aplicarVariacaoPercentual(200, 10)), 220);
});

test('aplicarVariacaoPercentual diminui o valor com percentual negativo', () => {
  assert.equal(aplicarVariacaoPercentual(200, -10), 180);
});

test('mesesParaAtingirMeta retorna 0 meses quando o capital inicial já atinge a meta', () => {
  const r = mesesParaAtingirMeta({ capitalInicial: 1000, aporteMensal: 0, taxaMensal: 0.01, valorAlvo: 1000 });
  assert.equal(r.meses, 0);
  assert.equal(r.anos, 0);
});

test('mesesParaAtingirMeta calcula quantos meses faltam pra atingir o valor-alvo', () => {
  const r = mesesParaAtingirMeta({ capitalInicial: 0, aporteMensal: 100, taxaMensal: 0, valorAlvo: 1000 });
  assert.equal(r.meses, 10);
  assert.equal(r.anos, 10 / 12);
});

test('mesesParaAtingirMeta retorna null quando a meta é inatingível dentro do teto de segurança', () => {
  const r = mesesParaAtingirMeta({ capitalInicial: 0, aporteMensal: 0, taxaMensal: 0, valorAlvo: 1000 });
  assert.equal(r.meses, null);
  assert.equal(r.anos, null);
});

test('aporteNecessarioParaMeta calcula um aporte mensal que, aplicado de volta em jurosCompostos, atinge o valor-alvo', () => {
  const meses = 24;
  const entrada = { capitalInicial: 1000, meses, taxaMensal: 0.01, valorAlvo: 50000 };
  const r = aporteNecessarioParaMeta(entrada);
  const verificacao = jurosCompostos({ capitalInicial: 1000, aporteMensal: r.aporteMensal, taxaMensal: 0.01, meses });
  assert.equal(arred(verificacao.montanteFinal), 50000);
});

test('aporteNecessarioParaMeta com taxa zero calcula um aporte linear', () => {
  const r = aporteNecessarioParaMeta({ capitalInicial: 200, meses: 10, taxaMensal: 0, valorAlvo: 1200 });
  assert.equal(r.aporteMensal, 100);
});

test('aporteNecessarioParaMeta retorna 0 quando o capital inicial já supera a meta sozinho', () => {
  const r = aporteNecessarioParaMeta({ capitalInicial: 2000, meses: 12, taxaMensal: 0.01, valorAlvo: 1000 });
  assert.equal(r.aporteMensal, 0);
});

test('aporteNecessarioParaMeta com prazo zero ou negativo retorna null', () => {
  assert.equal(aporteNecessarioParaMeta({ capitalInicial: 100, meses: 0, taxaMensal: 0.01, valorAlvo: 1000 }).aporteMensal, null);
  assert.equal(aporteNecessarioParaMeta({ capitalInicial: 100, meses: -3, taxaMensal: 0.01, valorAlvo: 1000 }).aporteMensal, null);
});

// --- Agenda de dividendos previstos ---

test('proximosDividendosPrevistos lista os dividendos previstos futuros de todos os ativos, ordenados por data', () => {
  const investimentos = [
    {
      id: 'i1',
      nome: 'PETR4',
      proventosPrevistos: [
        { id: 'p1', data: '2026-09-15', valor: 50 },
        { id: 'p2', data: '2026-08-30', valor: 20 },
      ],
    },
    {
      id: 'i2',
      nome: 'HGLG11',
      proventosPrevistos: [{ id: 'p3', data: '2026-09-01', valor: 30 }],
    },
  ];
  const agenda = proximosDividendosPrevistos(investimentos, '2026-08-25');
  assert.equal(agenda.length, 3);
  assert.deepEqual(agenda.map((a) => a.id), ['p2', 'p3', 'p1']);
  assert.equal(agenda[0].nome, 'PETR4');
  assert.equal(agenda[0].investimentoId, 'i1');
});

test('proximosDividendosPrevistos ignora datas anteriores à data de referência', () => {
  const investimentos = [
    { id: 'i1', nome: 'PETR4', proventosPrevistos: [{ id: 'p1', data: '2026-01-01', valor: 50 }] },
  ];
  assert.deepEqual(proximosDividendosPrevistos(investimentos, '2026-08-25'), []);
});

test('proximosDividendosPrevistos lida com ativos sem nenhum previsto cadastrado', () => {
  const investimentos = [{ id: 'i1', nome: 'PETR4' }];
  assert.deepEqual(proximosDividendosPrevistos(investimentos, '2026-08-25'), []);
});

// --- Monograma do ativo (ícone) ---

test('iniciaisAtivo usa as duas primeiras letras de um nome de uma palavra só (ticker)', () => {
  assert.equal(iniciaisAtivo('PETR4'), 'PE');
  assert.equal(iniciaisAtivo('AAPL'), 'AA');
});

test('iniciaisAtivo usa a primeira letra de cada uma das duas primeiras palavras de um nome composto', () => {
  assert.equal(iniciaisAtivo('Tesouro Selic'), 'TS');
});

test('iniciaisAtivo lida com nome vazio ou de uma letra só', () => {
  assert.equal(iniciaisAtivo(''), '?');
  assert.equal(iniciaisAtivo('B'), 'B');
});

test('corIndiceAtivo é determinístico: o mesmo nome sempre cai no mesmo índice', () => {
  assert.equal(corIndiceAtivo('PETR4', 8), corIndiceAtivo('PETR4', 8));
});

test('corIndiceAtivo devolve sempre um índice dentro do tamanho da paleta', () => {
  for (const nome of ['PETR4', 'AAPL', 'HGLG11', 'BTC', 'Tesouro Selic', '']) {
    const indice = corIndiceAtivo(nome, 8);
    assert.ok(indice >= 0 && indice < 8);
  }
});

// --- numeroDecimalFlexivel (parser de taxa/percentual — aceita ponto OU vírgula como decimal) ---
// Bug real: o teclado numérico de celular normalmente digita ponto, não vírgula; campos de
// taxa/percentual da calculadora (que não são .nv-campo-moeda) precisam aceitar os dois sem
// interpretar "1.5" como 15.

test('numeroDecimalFlexivel aceita vírgula como decimal (padrão brasileiro)', () => {
  assert.equal(numeroDecimalFlexivel('1,5'), 1.5);
});

test('numeroDecimalFlexivel aceita ponto como decimal (teclado numérico de celular)', () => {
  assert.equal(numeroDecimalFlexivel('1.5'), 1.5);
});

test('numeroDecimalFlexivel trata o separador mais à direita como decimal, mesmo com os dois presentes', () => {
  assert.equal(numeroDecimalFlexivel('1.234,56'), 1234.56); // estilo brasileiro: ponto de milhar, vírgula decimal
  assert.equal(numeroDecimalFlexivel('1,234.56'), 1234.56); // estilo americano: vírgula de milhar, ponto decimal
});

test('numeroDecimalFlexivel lida com número negativo e sem separador', () => {
  assert.equal(numeroDecimalFlexivel('-10'), -10);
  assert.equal(numeroDecimalFlexivel('10'), 10);
});

test('numeroDecimalFlexivel devolve 0 pra texto vazio ou inválido', () => {
  assert.equal(numeroDecimalFlexivel(''), 0);
  assert.equal(numeroDecimalFlexivel(undefined), 0);
  assert.equal(numeroDecimalFlexivel('abc'), 0);
});

test('PERGUNTAS_PERFIL tem 4 perguntas, cada uma com opções pontuadas de 0 a 3', () => {
  assert.equal(PERGUNTAS_PERFIL.length, 4);
  for (const p of PERGUNTAS_PERFIL) {
    assert.ok(p.id && p.pergunta, 'pergunta precisa de id e enunciado');
    assert.equal(p.opcoes.length, 4);
    assert.deepEqual(p.opcoes.map((o) => o.pontos), [0, 1, 2, 3]);
  }
});

test('perfilDeInvestidor classifica como conservador quem pontua baixo', () => {
  const r = perfilDeInvestidor({ reacaoQueda: 0, prazo: 0, experiencia: 0, reserva: 1 });
  assert.equal(r.pontos, 1);
  assert.equal(r.perfil, 'conservador');
});

test('perfilDeInvestidor classifica como moderado na faixa do meio', () => {
  const r = perfilDeInvestidor({ reacaoQueda: 2, prazo: 2, experiencia: 1, reserva: 1 });
  assert.equal(r.pontos, 6);
  assert.equal(r.perfil, 'moderado');
});

test('perfilDeInvestidor classifica como arrojado quem pontua alto', () => {
  const r = perfilDeInvestidor({ reacaoQueda: 3, prazo: 3, experiencia: 3, reserva: 3 });
  assert.equal(r.pontos, 12);
  assert.equal(r.perfil, 'arrojado');
});

test('perfilDeInvestidor trata resposta faltando como zero, sem quebrar', () => {
  const r = perfilDeInvestidor({ reacaoQueda: 3 });
  assert.equal(r.pontos, 3);
  assert.equal(r.perfil, 'conservador');
});

test('alocacaoSugeridaPorPerfil devolve percentuais que somam exatamente 100 nos três perfis', () => {
  for (const perfil of ['conservador', 'moderado', 'arrojado']) {
    const alocacao = alocacaoSugeridaPorPerfil(perfil);
    const soma = Object.values(alocacao).reduce((a, b) => a + b, 0);
    assert.equal(soma, 100, `${perfil} deveria somar 100`);
  }
});

test('alocacaoSugeridaPorPerfil usa só tipos de ativo válidos, nunca um ativo específico', () => {
  const tiposValidos = ['acao', 'fii', 'fundo_investimento', 'criptomoeda', 'stock', 'reit', 'bdr', 'etf', 'etf_internacional', 'tesouro_direto', 'renda_fixa', 'outro'];
  for (const perfil of ['conservador', 'moderado', 'arrojado']) {
    for (const tipo of Object.keys(alocacaoSugeridaPorPerfil(perfil))) {
      assert.ok(tiposValidos.includes(tipo), `${tipo} não é um tipo de ativo do app`);
    }
  }
});

test('alocacaoSugeridaPorPerfil dá mais renda fixa ao conservador e mais ação ao arrojado', () => {
  const conservador = alocacaoSugeridaPorPerfil('conservador');
  const arrojado = alocacaoSugeridaPorPerfil('arrojado');
  const rendaFixaConservador = (conservador.renda_fixa || 0) + (conservador.tesouro_direto || 0);
  const rendaFixaArrojado = (arrojado.renda_fixa || 0) + (arrojado.tesouro_direto || 0);
  assert.ok(rendaFixaConservador > rendaFixaArrojado);
  assert.ok((arrojado.acao || 0) > (conservador.acao || 0));
});

test('alocacaoSugeridaPorPerfil devolve null pra perfil desconhecido', () => {
  assert.equal(alocacaoSugeridaPorPerfil('qualquer'), null);
});

test('alocacaoSugeridaPorPerfil só usa tipos que o formulário manual também edita', () => {
  // Trava a regressão: se o perfil gravasse um tipo fora de TIPOS_ALOCACAO, salvar o formulário
  // manual de alocação apagaria esse tipo em silêncio.
  for (const perfil of ['conservador', 'moderado', 'arrojado']) {
    for (const tipo of Object.keys(alocacaoSugeridaPorPerfil(perfil))) {
      assert.ok(TIPOS_ALOCACAO.includes(tipo), `${tipo} não está em TIPOS_ALOCACAO`);
    }
  }
});
