const test = require('node:test');
const { PERGUNTAS_PERFIL, alocacaoSugeridaPorPerfil } = require('./logic.js');
const assert = require('node:assert/strict');
const {
  formatCurrency,
  formatPercent,
  formatAnos,
  renderCalendario,
  renderDiaDetalhe,
  renderEntradaRapida,
  renderPerguntasPerfil,
  renderResultadoPerfil,
  renderResumo,
  renderLancamentos,
  renderNovoLancamento,
  renderCategoriaDetalhe,
  renderMetas,
  renderConfiguracoes,
  renderImportarPlanilha,
  renderAbertura,
  renderInvestimentos,
  renderAtivoDetalhe,
  renderPin,
  renderComboSelect,
  renderComboBusca,
  opcoesTipoInvestimento,
  renderCalculadoras,
  monogramaAtivo,
} = require('./render.js');
const { estadoInicial, applyAction, alertasFinanceiros, resumoMensal, totalCarteira, gastoDaMeta } = require('./logic.js');
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');
const { Script } = require('node:vm');

function estado(overrides) {
  return { ...estadoInicial(), ...overrides };
}

test('formatCurrency formata em reais no padrão pt-BR', () => {
  // Intl.NumberFormat usa espaço fino/NBSP entre "R$" e o número (varia por versão do ICU) — normaliza antes de comparar.
  assert.equal(formatCurrency(1234.5).replace(/\s/g, ' '), 'R$ 1.234,50');
});

test('formatPercent formata com sinal e vírgula decimal', () => {
  assert.equal(formatPercent(7.5), '+7,50%');
  assert.equal(formatPercent(-5), '-5,00%');
});

test('formatAnos usa vírgula decimal e uma casa no padrão pt-BR', () => {
  assert.equal(formatAnos(18.1666), '18,2');
  assert.equal(formatAnos(5), '5,0');
});

test('formatAnos acompanha o idioma escolhido', () => {
  assert.equal(formatAnos(18.1666, 'en'), '18.2');
});

test('renderResumo mostra o wordmark da marca e o saldo do mês', () => {
  const state = estado({
    lancamentos: [
      { id: '1', data: '2026-08-05', tipo: 'receita', categoria: 'Salário', descricao: 'Salário', valorTotal: 4500, parcelas: 1 },
      { id: '2', data: '2026-08-07', tipo: 'despesa', categoria: 'Moradia', descricao: 'Aluguel', valorTotal: 1200, parcelas: 1 },
    ],
  });
  const html = renderResumo(state, 2026, 8);
  assert.match(html, /NUVRA/);
  assert.match(html, /AGO 2026/);
  assert.match(html, /3\.300,00/); // saldo do mês (4500 - 1200)
  assert.match(html, /4\.500,00/); // receitas
  assert.match(html, /1\.200,00/); // despesas
  assert.match(html, /Moradia/); // barra de gastos por categoria
});

test('renderResumo traduz os rótulos e o número quando o idioma é inglês', () => {
  const state = estado({
    idioma: 'en',
    lancamentos: [
      { id: '1', data: '2026-08-05', tipo: 'receita', categoria: 'Salário', descricao: 'Salário', valorTotal: 4500, parcelas: 1 },
    ],
  });
  const html = renderResumo(state, 2026, 8);
  assert.match(html, /MONTH BALANCE/);
  assert.match(html, /INCOME/);
  assert.match(html, /EXPENSES/);
  assert.match(html, /PORTFOLIO/);
  assert.match(html, /EXPENSES BY CATEGORY/);
  assert.match(html, /SEE ALL/);
  assert.match(html, /OPEN INSTALLMENTS/);
  assert.match(html, /No open installments this month\./);
  assert.match(html, /AUG 2026/); // mês abreviado em inglês no cabeçalho
  assert.match(html, /4,500\.00/); // separador de milhar/decimal em inglês
  assert.doesNotMatch(html, /SALDO DO MÊS/);
});

test('renderResumo traduz pro espanhol', () => {
  const html = renderResumo(estado({ idioma: 'es' }), 2026, 8);
  assert.match(html, /SALDO DEL MES/);
  assert.match(html, /GASTOS/);
  assert.match(html, /CARTERA/);
});

test('tabBar (via renderResumo) traduz os rótulos das abas', () => {
  // Rótulos por extenso e em caixa mista: "LANÇAM."/"CALEND." abreviavam por falta de espaço,
  // que a barra com ícone em cima e nome embaixo resolveu.
  const html = renderResumo(estado({ idioma: 'en' }), 2026, 8);
  assert.match(html, />Summary</);
  assert.match(html, />Entries</);
  assert.match(html, />Goals</);
  assert.match(html, />Calendar</);
  assert.doesNotMatch(html, />CALEND\.</);
});

test('tabBar mostra o nome inteiro de cada aba, com ícone', () => {
  const html = renderResumo(estado(), 2026, 8);
  for (const nome of ['Resumo', 'Lançamentos', 'Carteira', 'Metas', 'Calendário']) {
    assert.match(html, new RegExp(`>${nome}<`), `aba ${nome}`);
  }
  const abas = html.match(/<nav class="nv-tabbar--icones">[\s\S]*?<\/nav>/);
  assert.ok(abas, 'barra de abas encontrada');
  assert.equal((abas[0].match(/<svg/g) || []).length, 5, 'um ícone por aba');
});

test('renderResumo lista parcelas em aberto do mês', () => {
  const state = estado({
    lancamentos: [
      { id: '1', data: '2026-08-10', descricao: 'Notebook', tipo: 'despesa', categoria: 'Outras Despesas', valorTotal: 3600, parcelas: 12 },
    ],
  });
  const html = renderResumo(state, 2026, 9);
  assert.match(html, /Notebook/);
  assert.match(html, /parcela 2 de 12/); // era "2/12": no cartão sobra espaço pra dizer por extenso
});

test('renderResumo esconde valores quando ocultarValores está ativo', () => {
  const state = estado({
    lancamentos: [{ id: '1', data: '2026-08-05', tipo: 'receita', categoria: 'Salário', descricao: 'Salário', valorTotal: 4500, parcelas: 1 }],
    ocultarValores: true,
  });
  const html = renderResumo(state, 2026, 8);
  assert.equal(html.includes('4.500,00'), false);
  assert.match(html, /••••/);
});

test('renderLancamentos mostra "nenhum lançamento" quando a lista do mês está vazia', () => {
  const html = renderLancamentos(estado(), 2026, 8);
  assert.match(html, /Nenhum lançamento neste mês/);
});

test('renderLancamentos escapa HTML da descrição para evitar injeção', () => {
  const state = estado({
    lancamentos: [
      { id: '1', data: '2026-08-01', descricao: '<script>alert(1)</script>', tipo: 'despesa', categoria: 'Lazer', valorTotal: 10, parcelas: 1 },
    ],
  });
  const html = renderLancamentos(state, 2026, 8);
  assert.equal(html.includes('<script>alert'), false);
  assert.match(html, /&lt;script&gt;/);
});

test('renderLancamentos usa a categoria como nome do lançamento quando a descrição fica vazia', () => {
  const state = estado({
    lancamentos: [
      { id: '1', data: '2026-08-01', descricao: '', tipo: 'despesa', categoria: 'Lazer', valorTotal: 10, parcelas: 1 },
    ],
  });
  const html = renderLancamentos(state, 2026, 8);
  assert.match(html, /<div class="nv-item-nome">Lazer/);
});

test('renderLancamentos mostra a tag de parcela quando o lançamento é parcelado', () => {
  const state = estado({
    lancamentos: [
      { id: '1', data: '2026-08-10', descricao: 'Notebook', tipo: 'despesa', categoria: 'Outras Despesas', valorTotal: 3600, parcelas: 12 },
    ],
  });
  const html = renderLancamentos(state, 2026, 9);
  assert.match(html, /nv-tag-parcela">2\/12</);
});

test('renderLancamentos aplica busca e filtro por tipo', () => {
  const state = estado({
    lancamentos: [
      { id: '1', data: '2026-08-01', descricao: 'Salário', categoria: 'Salário', tipo: 'receita', valorTotal: 4500, parcelas: 1 },
      { id: '2', data: '2026-08-02', descricao: 'Aluguel', categoria: 'Moradia', tipo: 'despesa', valorTotal: 1200, parcelas: 1 },
    ],
  });
  const somenteReceitas = renderLancamentos(state, 2026, 8, { filtro: 'receitas' });
  assert.match(somenteReceitas, /Salário/);
  assert.equal(somenteReceitas.includes('Aluguel'), false);

  const busca = renderLancamentos(state, 2026, 8, { busca: 'alug' });
  assert.match(busca, /Aluguel/);
  assert.equal(busca.includes('Salário'), false);
});

test('renderNovoLancamento pré-preenche os campos ao editar e mostra o botão de excluir', () => {
  const html = renderNovoLancamento(estado(), {
    id: 'a1',
    data: '2026-08-10',
    descricao: 'Mercado',
    categoria: 'Alimentação',
    tipo: 'despesa',
    valorTotal: 200,
    parcelas: 1,
  });
  assert.match(html, /value="Mercado"/);
  assert.match(html, /excluir-lancamento-atual/);
});

test('renderNovoLancamento só lista categorias de despesa quando o tipo é despesa', () => {
  const html = renderNovoLancamento(estado(), { tipo: 'despesa' });
  assert.match(html, /Moradia/);
  assert.doesNotMatch(html, /Salário/);
});

test('renderNovoLancamento só lista categorias de receita quando o tipo é receita', () => {
  const html = renderNovoLancamento(estado(), { tipo: 'receita' });
  assert.match(html, /Salário/);
  assert.doesNotMatch(html, /Moradia/);
});

test('renderNovoLancamento não mostra o botão de excluir para um lançamento novo', () => {
  const html = renderNovoLancamento(estado(), { tipo: 'despesa', parcelas: 1 });
  assert.equal(html.includes('excluir-lancamento-atual'), false);
});

test('renderCategoriaDetalhe mostra o total do mês e os lançamentos da categoria', () => {
  const state = estado({
    lancamentos: [
      { id: '1', data: '2026-08-05', descricao: 'Mercado', categoria: 'Alimentação', tipo: 'despesa', valorTotal: 300, parcelas: 1 },
      { id: '2', data: '2026-08-06', descricao: 'Aluguel', categoria: 'Moradia', tipo: 'despesa', valorTotal: 1200, parcelas: 1 },
    ],
  });
  const html = renderCategoriaDetalhe(state, 'Alimentação', 2026, 8);
  assert.match(html, /Alimentação/);
  assert.match(html, /300,00/);
  assert.match(html, /Mercado/);
  assert.equal(html.includes('Aluguel'), false);
});

test('renderMetas mostra o progresso e destaca metas excedidas', () => {
  const state = estado({
    lancamentos: [{ id: '1', data: '2026-08-01', descricao: 'Uber', categoria: 'Transporte', tipo: 'despesa', valorTotal: 640, parcelas: 1 }],
    metas: [{ id: 'm1', categoria: 'Transporte', limite: 500 }],
  });
  const html = renderMetas(state, 2026, 8);
  assert.match(html, /Transporte/);
  assert.match(html, /excedida/);
  assert.match(html, /Excedeu/);
});

test('renderMetas mostra o nome apelidado da meta, com a categoria como legenda', () => {
  const state = estado({
    lancamentos: [],
    metas: [{ id: 'm1', categoria: 'Transporte', nome: 'Carro novo', limite: 500 }],
  });
  const html = renderMetas(state, 2026, 8);
  assert.match(html, /Carro novo/);
  assert.match(html, /Transporte/);
});

test('renderMetas usa a categoria como nome quando a meta não tem apelido', () => {
  const state = estado({ lancamentos: [], metas: [{ id: 'm1', categoria: 'Transporte', limite: 500 }] });
  const html = renderMetas(state, 2026, 8);
  assert.match(html, /Transporte/);
});

test('renderMetas mostra mensagem quando não há metas', () => {
  const html = renderMetas(estado(), 2026, 8);
  assert.match(html, /Nenhuma meta definida/);
});

test('renderConfiguracoes lista as contas cadastradas e o tema ativo', () => {
  const state = estado({ contas: [{ id: 'c1', nome: 'Nubank', tipo: 'cartao', fechamento: 3 }], tema: 'claro' });
  const html = renderConfiguracoes(state);
  assert.match(html, /Nubank/);
  assert.match(html, /data-tema="claro" class="ativo"/);
});

test('renderConfiguracoes mostra um ícone em cada opção de tema (claro/escuro/sistema), não só o texto', () => {
  const html = renderConfiguracoes(estado({ tema: 'escuro' }));
  const segmentado = html.match(/<div class="nv-segmentado-tema">[\s\S]*?<\/div>/)[0];
  const botoes = segmentado.split('<button').slice(1);
  assert.equal(botoes.length, 3);
  for (const botao of botoes) {
    assert.match(botao, /<svg/);
  }
});

test('renderConfiguracoes mostra o seletor de idioma com os três idiomas, marcando o ativo', () => {
  const html = renderConfiguracoes(estado({ idioma: 'es' }));
  assert.match(html, /data-acao="definir-idioma" data-idioma="pt"/);
  assert.match(html, /data-acao="definir-idioma" data-idioma="en"/);
  assert.match(html, /data-acao="definir-idioma" data-idioma="es"\s+class="ativo"/);
  assert.match(html, /PORTUGUÊS/);
  assert.match(html, /ENGLISH/);
  assert.match(html, /ESPAÑOL/);
});

test('renderConfiguracoes traduz os textos da tela quando o idioma é inglês', () => {
  const html = renderConfiguracoes(estado({ idioma: 'en' }), true);
  assert.match(html, />Settings</);
  assert.match(html, /APPEARANCE/);
  assert.match(html, /ACCOUNTS & CARDS/);
  assert.match(html, /Access PIN/);
  assert.match(html, /Enabled/);
  assert.match(html, /CHANGE/);
});

test('renderConfiguracoes mostra o PIN como desativado por padrão, com botão pra definir', () => {
  const html = renderConfiguracoes(estado(), false);
  assert.match(html, /Desativado/);
  assert.match(html, /DEFINIR/);
  assert.doesNotMatch(html, /REMOVER/);
});

test('renderConfiguracoes mostra o PIN como ativado, com botões de alterar e remover', () => {
  const html = renderConfiguracoes(estado(), true);
  assert.match(html, /Ativado/);
  assert.match(html, /ALTERAR/);
  assert.match(html, /REMOVER/);
});

test('renderPin mostra a marca e o campo de PIN, sem mensagem de erro por padrão', () => {
  const html = renderPin(false);
  assert.match(html, /NUVRA/);
  assert.match(html, /name="pin"/);
  assert.doesNotMatch(html, /PIN incorreto/);
});

test('renderPin mostra a mensagem de erro quando o PIN foi digitado errado', () => {
  const html = renderPin(true);
  assert.match(html, /PIN incorreto/);
});

test('renderComboSelect marca o item correspondente ao valor atual como ativo', () => {
  const html = renderComboSelect('tipo', [{ valor: 'acao', rotulo: 'Ação' }, { valor: 'fii', rotulo: 'Fundo Imobiliário' }], 'fii');
  assert.match(html, /name="tipo" value="fii"/);
  assert.match(html, /<span class="nv-combo-valor">Fundo Imobiliário<\/span>/);
  assert.match(html, /class="nv-combo-item ativo"[^>]*data-valor="fii"/);
});

test('renderComboSelect mostra mensagem de vazio quando não há opções', () => {
  const html = renderComboSelect('categoria', [], null);
  assert.match(html, /Nenhuma opção encontrada/);
});

test('renderComboBusca lista as sugestões e mantém o valor digitado', () => {
  const html = renderComboBusca('nome', 'PETR', ['PETR4', 'PETZ3']);
  assert.match(html, /value="PETR"/);
  assert.match(html, /data-valor="PETR4"/);
  assert.match(html, /data-valor="PETZ3"/);
});

test('renderComboSelect e renderComboBusca aceitam um id explícito, pra <label for="..."> conseguir focar o campo certo', () => {
  const selectHtml = renderComboSelect('tipo', [{ valor: 'acao', rotulo: 'Ação' }], 'acao', 'campo-tipo-x');
  assert.match(selectHtml, /id="campo-tipo-x"/);
  const buscaHtml = renderComboBusca('nome', '', ['PETR4'], 'campo-nome-x');
  assert.match(buscaHtml, /id="campo-nome-x"/);
});

test('renderComboBusca inclui uma mensagem de vazio (escondida) pro caso de filtro sem nenhum resultado', () => {
  const comSugestoes = renderComboBusca('nome', '', ['PETR4']);
  assert.match(comSugestoes, /nv-combo-vazio" hidden/);
  const semSugestoes = renderComboBusca('nome', '', []);
  assert.match(semSugestoes, /nv-combo-vazio" >|nv-combo-vazio">/);
});

test('renderAbertura mostra a marca e o convite para começar', () => {
  const html = renderAbertura();
  assert.match(html, /NUVRA/);
  assert.match(html, /COMEÇAR/);
});

test('renderInvestimentos mostra rendimento positivo e negativo, com rótulo de tipo legível', () => {
  const state = estado({
    investimentos: [
      { id: '1', nome: 'ITSA4', tipo: 'acao', valorInvestido: 2000, valorAtual: 2150 },
      { id: '2', nome: 'Tesouro', tipo: 'renda_fixa', valorInvestido: 1000, valorAtual: 950 },
    ],
  });
  const html = renderInvestimentos(state);
  assert.match(html, /ITSA4/);
  assert.match(html, /Ação/);
  assert.match(html, /\+7,50%/);
  assert.match(html, /Tesouro/);
  assert.match(html, /-5,00%/);
});

test('renderInvestimentos mostra o gráfico de composição (SVG) com a legenda por tipo, ordenada do maior para o menor', () => {
  const state = estado({
    investimentos: [
      { id: '1', nome: 'ITSA4', tipo: 'acao', precoAtual: 10, operacoes: [{ id: 'o1', tipo: 'compra', data: '2026-01-01', quantidade: 10, precoUnitario: 10 }] },
      { id: '2', nome: 'HGLG11', tipo: 'fii', precoAtual: 10, operacoes: [{ id: 'o2', tipo: 'compra', data: '2026-01-01', quantidade: 90, precoUnitario: 10 }] },
    ],
  });
  const html = renderInvestimentos(state);
  assert.match(html, /<svg[^>]*aria-label="Gráfico de composição/);
  // Procura dentro da legenda, não na tela inteira: "AÇÃO" é sufixo de "METAS DE ALOCAÇÃO", que
  // fica no cabeçalho do mesmo cartão — buscar solto acha o botão em vez do item da legenda.
  const legenda = html.match(/<div class="nv-composicao-legenda">[\s\S]*?<\/div>\s*<\/div>/);
  assert.ok(legenda, 'a legenda da composição deve estar no HTML');
  const posFii = legenda[0].indexOf('FUNDO IMOBILIÁRIO');
  const posAcao = legenda[0].indexOf('AÇÃO');
  assert.ok(posFii !== -1 && posAcao !== -1 && posFii < posAcao, 'FII (900) é maior que Ação (100), deve aparecer primeiro na legenda');
});

test('opcoesTipoInvestimento não inclui o grupo sintético "Outros" da composição entre os tipos selecionáveis', () => {
  const opcoes = opcoesTipoInvestimento();
  assert.equal(opcoes.filter((o) => o.rotulo === 'Outros').length, 0);
  assert.ok(opcoes.some((o) => o.valor === 'outro' && o.rotulo === 'Outro'));
});

test('renderInvestimentos agrupa tipos além do 6º em "Outros" na composição', () => {
  const tipos = ['acao', 'fii', 'fundo_investimento', 'criptomoeda', 'stock', 'reit', 'bdr', 'etf'];
  const investimentos = tipos.map((tipo, i) => ({
    id: String(i),
    nome: `Ativo ${i}`,
    tipo,
    precoAtual: 10,
    operacoes: [{ id: `o${i}`, tipo: 'compra', data: '2026-01-01', quantidade: 10 - i, precoUnitario: 10 }],
  }));
  const html = renderInvestimentos(estado({ investimentos }));
  assert.match(html, /OUTROS/);
});

test('renderInvestimentos mostra mensagem quando não há investimentos', () => {
  const html = renderInvestimentos(estado());
  assert.match(html, /Nenhum investimento cadastrado/);
});

test('renderInvestimentos calcula rendimento a partir de operações (formato novo) e não só do valor fixo antigo', () => {
  const state = estado({
    investimentos: [
      {
        id: '1',
        nome: 'ITSA4',
        tipo: 'acao',
        precoAtual: 25,
        operacoes: [{ id: 'o1', tipo: 'compra', data: '2026-01-10', quantidade: 20, precoUnitario: 20 }],
      },
    ],
  });
  const html = renderInvestimentos(state);
  assert.match(html, /ITSA4/);
  assert.match(html, /investido R\$\s*400,00/); // card do ativo: valor investido = 20 cotas × preço médio 20
  assert.doesNotMatch(html, /NaN/);
});

test('renderAtivoDetalhe mostra quantidade, preço médio e a lista de operações do ativo, mais recente primeiro', () => {
  const state = estado({
    investimentos: [
      {
        id: '1',
        nome: 'ITSA4',
        tipo: 'acao',
        precoAtual: 25,
        operacoes: [
          { id: 'o1', tipo: 'compra', data: '2026-01-10', quantidade: 10, precoUnitario: 20 },
          { id: 'o2', tipo: 'compra', data: '2026-02-10', quantidade: 10, precoUnitario: 30 },
        ],
      },
    ],
  });
  const html = renderAtivoDetalhe(state, '1');
  assert.match(html, /ITSA4/);
  assert.match(html, /nv-cell-valor">20,00</); // quantidade total
  assert.match(html, /nv-cell-valor">R\$\s*25,00</); // preço médio
  const posO1 = html.indexOf('o1');
  const posO2 = html.indexOf('o2');
  assert.ok(posO2 !== -1 && posO1 !== -1 && posO2 < posO1, 'operação mais recente (o2) deve aparecer antes de o1 na lista');
});

test('renderAtivoDetalhe mostra estado vazio quando o ativo ainda não tem operações lançadas', () => {
  const state = estado({ investimentos: [{ id: '1', nome: 'Novo Ativo', tipo: 'fii', precoAtual: 0, operacoes: [] }] });
  const html = renderAtivoDetalhe(state, '1');
  assert.match(html, /Nenhuma opera/);
});

test('renderInvestimentos mostra a sugestão de próximo aporte quando há alocação-alvo definida', () => {
  const state = estado({
    alocacaoAlvo: { acao: 50, fii: 50 },
    investimentos: [
      { id: '1', nome: 'ITSA4', tipo: 'acao', precoAtual: 10, operacoes: [{ id: 'o1', tipo: 'compra', data: '2026-01-01', quantidade: 80, precoUnitario: 10 }] },
      { id: '2', nome: 'HGLG11', tipo: 'fii', precoAtual: 10, operacoes: [{ id: 'o2', tipo: 'compra', data: '2026-01-01', quantidade: 20, precoUnitario: 10 }] },
    ],
  });
  const html = renderInvestimentos(state);
  assert.match(html, /PRÓXIMO APORTE/);
  assert.match(html, /Fundo Imobiliário/); // fii está abaixo da meta, deve aparecer primeiro
});

test('renderInvestimentos não mostra sugestão de aporte quando não há alocação-alvo definida', () => {
  const html = renderInvestimentos(estado({ investimentos: [{ id: '1', nome: 'ITSA4', tipo: 'acao', precoAtual: 10, operacoes: [] }] }));
  assert.doesNotMatch(html, /PRÓXIMO APORTE/);
});

test('renderAtivoDetalhe mostra o total de proventos recebidos e a lista, mais recente primeiro', () => {
  const state = estado({
    investimentos: [
      {
        id: '1',
        nome: 'ITSA4',
        tipo: 'acao',
        precoAtual: 10,
        operacoes: [],
        proventos: [
          { id: 'p1', data: '2026-01-10', tipo: 'dividendo', valor: 10 },
          { id: 'p2', data: '2026-02-10', tipo: 'jcp', valor: 5 },
        ],
      },
    ],
  });
  const html = renderAtivoDetalhe(state, '1');
  assert.match(html, /PROVENTOS/);
  assert.match(html, /R\$\s*15,00/); // total recebido
  const posP1 = html.indexOf('p1');
  const posP2 = html.indexOf('p2');
  assert.ok(posP2 !== -1 && posP1 !== -1 && posP2 < posP1);
});

test('renderAtivoDetalhe mostra estado vazio de proventos quando o ativo ainda não recebeu nenhum', () => {
  const html = renderAtivoDetalhe(estado({ investimentos: [{ id: '1', nome: 'X', tipo: 'acao', precoAtual: 0, operacoes: [], proventos: [] }] }), '1');
  assert.match(html, /Nenhum provento recebido ainda/);
});

test('renderInvestimentos mostra o imposto estimado do mês atual quando há venda tributável', () => {
  const hoje = new Date();
  const dataVenda = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-05`;
  const state = estado({
    investimentos: [
      {
        id: '1',
        nome: 'HGLG11',
        tipo: 'fii',
        precoAtual: 12,
        operacoes: [
          { id: 'o1', tipo: 'compra', data: '2026-01-01', quantidade: 100, precoUnitario: 10 },
          { id: 'o2', tipo: 'venda', data: dataVenda, quantidade: 100, precoUnitario: 12 },
        ],
      },
    ],
  });
  const html = renderInvestimentos(state);
  assert.match(html, /IMPOSTO ESTIMADO/);
  assert.match(html, /R\$\s*40,00/); // 20% sobre lucro de 200
  assert.match(html, /não substitui/i);
});

test('renderAtivoDetalhe mostra a agenda de dividendos previstos (futuros), separada dos recebidos', () => {
  const hoje = new Date();
  const dataFutura = new Date(hoje.getFullYear(), hoje.getMonth() + 2, 10).toISOString().slice(0, 10);
  const dataPassada = new Date(hoje.getFullYear() - 1, 0, 1).toISOString().slice(0, 10);
  const state = estado({
    investimentos: [
      {
        id: '1',
        nome: 'ITSA4',
        tipo: 'acao',
        precoAtual: 10,
        operacoes: [],
        proventosPrevistos: [
          { id: 'pv1', data: dataFutura, valor: 25, descricao: 'trimestral' },
          { id: 'pv2', data: dataPassada, valor: 10 },
        ],
      },
    ],
  });
  const html = renderAtivoDetalhe(state, '1');
  assert.match(html, /PRÓXIMOS DIVIDENDOS/);
  assert.ok(html.includes('pv1'));
  assert.ok(!html.includes('pv2'));
  assert.match(html, /trimestral/);
});

test('renderAtivoDetalhe mostra estado vazio de dividendos previstos quando não há nenhum futuro cadastrado', () => {
  const html = renderAtivoDetalhe(estado({ investimentos: [{ id: '1', nome: 'X', tipo: 'acao', precoAtual: 0, operacoes: [], proventosPrevistos: [] }] }), '1');
  assert.match(html, /Nenhum dividendo previsto cadastrado/);
});

test('renderInvestimentos mostra a agenda de próximos dividendos de todos os ativos, ordenada por data', () => {
  const hoje = new Date();
  const dataMaisPerto = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 5).toISOString().slice(0, 10);
  const dataMaisLonge = new Date(hoje.getFullYear(), hoje.getMonth() + 3, 5).toISOString().slice(0, 10);
  const state = estado({
    investimentos: [
      { id: '1', nome: 'ITSA4', tipo: 'acao', precoAtual: 10, operacoes: [], proventosPrevistos: [{ id: 'pv1', data: dataMaisLonge, valor: 25 }] },
      { id: '2', nome: 'HGLG11', tipo: 'fii', precoAtual: 100, operacoes: [], proventosPrevistos: [{ id: 'pv2', data: dataMaisPerto, valor: 12 }] },
    ],
  });
  const html = renderInvestimentos(state);
  assert.match(html, /PRÓXIMOS DIVIDENDOS/);
  const posHeading = html.indexOf('PRÓXIMOS DIVIDENDOS');
  const posPerto = html.indexOf('HGLG11', posHeading);
  const posLonge = html.indexOf('ITSA4', posHeading);
  assert.ok(posPerto !== -1 && posLonge !== -1 && posPerto < posLonge);
});

test('renderInvestimentos não mostra a agenda de dividendos quando nenhum ativo tem previsto futuro', () => {
  const html = renderInvestimentos(estado({ investimentos: [{ id: '1', nome: 'ITSA4', tipo: 'acao', precoAtual: 10, operacoes: [] }] }));
  assert.doesNotMatch(html, /PRÓXIMOS DIVIDENDOS/);
});

test('renderInvestimentos não mostra o card de imposto quando não há venda tributável no mês', () => {
  const html = renderInvestimentos(estado({ investimentos: [{ id: '1', nome: 'ITSA4', tipo: 'acao', precoAtual: 10, operacoes: [] }] }));
  assert.doesNotMatch(html, /IMPOSTO ESTIMADO/);
});

test('o bundle concatenado pelo build é um script clássico válido (sem colisão de identificadores)', () => {
  const raiz = path.join(__dirname, '..');
  execSync('node build.js', { cwd: raiz });
  const html = fs.readFileSync(path.join(raiz, 'dist', 'index.html'), 'utf8');
  const match = html.match(/<script>([\s\S]*)<\/script>/);
  assert.ok(match, 'dist/index.html deveria conter um bloco <script>');
  assert.doesNotThrow(() => new Script(match[1]), 'o script concatenado (logic.js + render.js + app.js) deve parsear sem SyntaxError — uma colisão de identificador top-level entre esses arquivos quebraria a página publicada inteira');
  assert.equal(html.includes('SCRIPT_INJECT'), false, 'o marcador <!-- SCRIPT_INJECT --> não deveria sobrar no HTML gerado');
});

// --- Tela de calculadoras ---

test('renderCalculadoras mostra os campos de juros compostos por padrão, com a aba compostos ativa', () => {
  const html = renderCalculadoras();
  assert.match(html, /data-calc="compostos"\s+class="ativo"/);
  assert.ok(html.includes('campo-calc-compostos-capital'));
  assert.ok(html.includes('campo-calc-compostos-aporte'));
  assert.ok(html.includes('campo-calc-compostos-taxa'));
  assert.ok(html.includes('campo-calc-compostos-meses'));
  assert.ok(!html.includes('campo-calc-simples-capital'));
});

test('renderCalculadoras("simples") mostra os campos de juros simples e marca a aba simples como ativa', () => {
  const html = renderCalculadoras('simples');
  assert.match(html, /data-calc="simples"\s+class="ativo"/);
  assert.ok(html.includes('campo-calc-simples-capital'));
  assert.ok(html.includes('campo-calc-simples-taxa'));
  assert.ok(html.includes('campo-calc-simples-meses'));
  assert.ok(!html.includes('campo-calc-compostos-capital'));
});

test('renderCalculadoras("porcentagem") mostra as três mini-calculadoras de porcentagem', () => {
  const html = renderCalculadoras('porcentagem');
  assert.ok(html.includes('campo-calc-pct1-percentual'));
  assert.ok(html.includes('campo-calc-pct1-valor'));
  assert.ok(html.includes('campo-calc-pct2-valor'));
  assert.ok(html.includes('campo-calc-pct2-total'));
  assert.ok(html.includes('campo-calc-pct3-valor'));
  assert.ok(html.includes('campo-calc-pct3-percentual'));
});

test('renderCalculadoras("milhao") no modo tempo mostra o aporte mensal e esconde o prazo desejado', () => {
  const html = renderCalculadoras('milhao', 'tempo');
  assert.ok(html.includes('campo-calc-milhao-aporte'));
  assert.ok(!html.includes('campo-calc-milhao-meses'));
  assert.ok(html.includes('campo-calc-milhao-alvo'));
  assert.ok(html.includes('campo-calc-milhao-capital'));
  assert.ok(html.includes('campo-calc-milhao-taxa'));
});

test('renderCalculadoras("milhao") no modo aporte mostra o prazo desejado e esconde o aporte mensal', () => {
  const html = renderCalculadoras('milhao', 'aporte');
  assert.ok(html.includes('campo-calc-milhao-meses'));
  assert.ok(!html.includes('campo-calc-milhao-aporte'));
});

test('renderCalculadoras("milhao") pré-preenche o valor-alvo padrão de R$1.000.000', () => {
  const html = renderCalculadoras('milhao');
  assert.ok(html.includes('1.000.000,00'));
});

// --- Monograma do ativo ---

test('monogramaAtivo mostra as iniciais dentro de um badge com classe nv-monograma', () => {
  const html = monogramaAtivo('PETR4');
  assert.match(html, /class="nv-monograma"/);
  assert.ok(html.includes('PE'));
});

test('monogramaAtivo é determinístico: o mesmo nome sempre gera a mesma cor de fundo', () => {
  const cor = (html) => html.match(/background:([^;"]+)/)[1];
  assert.equal(cor(monogramaAtivo('PETR4')), cor(monogramaAtivo('PETR4')));
});

test('renderInvestimentos mostra o monograma de cada ativo listado', () => {
  const html = renderInvestimentos(estado({ investimentos: [{ id: '1', nome: 'PETR4', tipo: 'acao', precoAtual: 10, operacoes: [] }] }));
  assert.match(html, /nv-monograma/);
  assert.ok(html.includes('PE'));
});

test('renderAtivoDetalhe mostra o monograma do ativo no cabeçalho', () => {
  const html = renderAtivoDetalhe(estado({ investimentos: [{ id: '1', nome: 'AAPL', tipo: 'stock', precoAtual: 10, operacoes: [] }] }), '1');
  assert.match(html, /nv-monograma/);
  assert.ok(html.includes('AA'));
});

test('renderPerguntasPerfil mostra as 4 perguntas com 4 opções de rádio cada', () => {
  const html = renderPerguntasPerfil();
  for (const p of PERGUNTAS_PERFIL) {
    assert.ok(html.includes(p.pergunta), `faltou a pergunta: ${p.pergunta}`);
    for (const o of p.opcoes) assert.ok(html.includes(o.texto), `faltou a opção: ${o.texto}`);
  }
  assert.equal((html.match(/type="radio"/g) || []).length, 16);
});

test('renderPerguntasPerfil marca a primeira opção de cada pergunta, pra nunca enviar vazio', () => {
  const html = renderPerguntasPerfil();
  assert.equal((html.match(/checked/g) || []).length, 4);
});

test('renderResultadoPerfil mostra o nome do perfil e a alocação sugerida', () => {
  const html = renderResultadoPerfil('conservador', 3, { tesouro_direto: 45, renda_fixa: 35 });
  assert.ok(html.toLowerCase().includes('conservador'));
  assert.ok(html.includes('Tesouro Direto'));
  assert.ok(html.includes('45%'));
  assert.ok(html.includes('Renda Fixa'));
  assert.ok(html.includes('35%'));
});

test('renderResultadoPerfil sempre traz o aviso de que não é recomendação de investimento', () => {
  // Sugerir ativo a uma pessoa é atividade regulada pela CVM; o app só distribui percentual por
  // classe de ativo, e o aviso não pode sumir da tela.
  for (const perfil of ['conservador', 'moderado', 'arrojado']) {
    const html = renderResultadoPerfil(perfil, 6, alocacaoSugeridaPorPerfil(perfil));
    assert.ok(/não é recomendaç/i.test(html), `faltou o aviso no perfil ${perfil}`);
  }
});

test('renderResultadoPerfil escapa o perfil recebido', () => {
  const html = renderResultadoPerfil('<img src=x onerror=alert(1)>', 0, {});
  assert.ok(!html.includes('<img src=x'));
  assert.ok(html.includes('&lt;img'));
});

test('renderCalendario monta a grade do mês com os dias e o saldo de cada um', () => {
  const state = estado({
    lancamentos: [
      { id: '1', data: '2026-08-05', tipo: 'receita', categoria: 'Salário', descricao: 'Salário', valorTotal: 4500, parcelas: 1 },
      { id: '2', data: '2026-08-07', tipo: 'despesa', categoria: 'Lazer', descricao: 'Cinema', valorTotal: 90, parcelas: 1 },
    ],
  });
  const html = renderCalendario(state, 2026, 8);
  assert.match(html, /AGOSTO 2026/); // mesmo cabeçalho de Lançamentos e Metas, com navegação de mês
  assert.match(html, /data-dia="2026-08-05"/);
  assert.match(html, /data-dia="2026-08-07"/);
  assert.match(html, /nv-dia-positivo/); // dia 5 fechou no azul
  assert.match(html, /nv-dia-negativo/); // dia 7 fechou no vermelho
});

test('renderCalendario marca só os dias com movimento como clicáveis', () => {
  const state = estado({
    lancamentos: [{ id: '1', data: '2026-08-05', tipo: 'despesa', categoria: 'Lazer', descricao: 'X', valorTotal: 10, parcelas: 1 }],
  });
  const html = renderCalendario(state, 2026, 8);
  assert.equal((html.match(/data-acao="abrir-dia"/g) || []).length, 1);
});

test('renderDiaDetalhe lista os lançamentos do dia com entrada, saída e saldo', () => {
  const state = estado({
    lancamentos: [
      { id: '1', data: '2026-08-05', tipo: 'receita', categoria: 'Salário', descricao: 'Salário', valorTotal: 4500, parcelas: 1 },
      { id: '2', data: '2026-08-05', tipo: 'despesa', categoria: 'Moradia', descricao: 'Aluguel', valorTotal: 1200, parcelas: 1 },
    ],
  });
  const html = renderDiaDetalhe(state, '2026-08-05');
  assert.match(html, /Salário/);
  assert.match(html, /Aluguel/);
  assert.match(html, /4\.500,00/);
  assert.match(html, /1\.200,00/);
  assert.match(html, /3\.300,00/); // saldo do dia
});

test('renderDiaDetalhe avisa quando o dia não teve movimento', () => {
  const html = renderDiaDetalhe(estado(), '2026-08-05');
  assert.match(html, /Nenhum lançamento/);
});

test('renderEntradaRapida mostra o campo de texto livre e um exemplo', () => {
  const html = renderEntradaRapida();
  assert.match(html, /campo-entrada-rapida/);
  assert.match(html, /mercado/i); // exemplo pra ensinar o formato
});

test('renderCalendario mostra a barra de abas, senão o usuário fica preso na tela', () => {
  const html = renderCalendario(estado(), 2026, 8);
  assert.match(html, /nv-tabbar/);
  assert.match(html, /data-tab="resumo"/);
});

test('renderInvestimentos mostra o patrimônio líquido quando há dívida registrada', () => {
  const state = estado({
    investimentos: [{ id: 'i1', nome: 'X', tipo: 'renda_fixa', precoAtual: 10000, operacoes: [{ id: 'o1', tipo: 'compra', data: '2026-01-01', quantidade: 1, precoUnitario: 10000 }] }],
    dividas: [{ id: 'd1', nome: 'Carro', tipo: 'financiamento_veiculo', saldoDevedor: 4000, valorParcela: 500, parcelasRestantes: 8 }],
  });
  const html = renderInvestimentos(state);
  assert.match(html, /PATRIMÔNIO LÍQUIDO/);
  assert.match(html, /6\.000,00/); // 10.000 de ativo − 4.000 de dívida
  assert.match(html, /Carro/);
});

test('renderInvestimentos não polui a tela com patrimônio líquido de quem não tem dívida', () => {
  const state = estado({
    investimentos: [{ id: 'i1', nome: 'X', tipo: 'renda_fixa', precoAtual: 10000, operacoes: [{ id: 'o1', tipo: 'compra', data: '2026-01-01', quantidade: 1, precoUnitario: 10000 }] }],
  });
  assert.doesNotMatch(renderInvestimentos(state), /PATRIMÔNIO LÍQUIDO/);
});

test('renderInvestimentos escapa o nome da dívida', () => {
  const state = estado({
    dividas: [{ id: 'd1', nome: '<img src=x onerror=alert(1)>', tipo: 'emprestimo', saldoDevedor: 100, valorParcela: 10, parcelasRestantes: 10 }],
  });
  const html = renderInvestimentos(state);
  assert.equal(html.includes('<img src=x'), false);
  assert.match(html, /&lt;img/);
});

// --- renderImportarPlanilha ---

test('renderImportarPlanilha passo 1 mostra input de arquivo e área de texto', () => {
  const html = renderImportarPlanilha(estado(), null);
  assert.match(html, /id="campo-arquivo-csv"/);
  assert.match(html, /id="campo-texto-csv"/);
  assert.match(html, /data-acao="analisar-csv"/);
});

test('renderImportarPlanilha passo 2 pré-seleciona as colunas sugeridas e lista as contas', () => {
  const imp = {
    colunas: ['Data', 'Valor', 'Descrição'],
    linhas: [['01/08/2026', '-10,00', 'Mercado']],
    sugestao: { data: 0, valor: 1, descricao: 2, categoria: null, parcelas: null, conta: null },
  };
  const html = renderImportarPlanilha(estado({ contas: [{ id: 'c1', nome: 'Nubank' }] }), imp);
  assert.match(html, /<select id="map-data">[\s\S]*?<option value="0" selected>Data<\/option>/);
  assert.match(html, /<select id="map-valor">[\s\S]*?<option value="1" selected>Valor<\/option>/);
  assert.match(html, /id="import-conta-padrao"/);
  assert.match(html, /data-acao="confirmar-importacao"/);
});

test('renderImportarPlanilha passo 2 escapa o conteúdo da prévia', () => {
  const imp = {
    colunas: ['Descrição'],
    linhas: [['<img src=x onerror=alert(1)>']],
    sugestao: { data: null, valor: null, descricao: 0, categoria: null, parcelas: null, conta: null },
  };
  const html = renderImportarPlanilha(estado(), imp);
  assert.equal(html.includes('<img src=x'), false);
  assert.match(html, /&lt;img/);
});

test('renderImportarPlanilha passo 3 resume importados e ignorados', () => {
  const imp = { colunas: ['a'], linhas: [], sugestao: {}, resultado: { total: 12, ignoradas: [{ linha: 3, motivo: 'Valor ausente ou inválido' }] } };
  const html = renderImportarPlanilha(estado(), imp);
  assert.match(html, />12</);
  assert.match(html, /Linha 3/);
  assert.match(html, /Valor ausente/);
  assert.match(html, /data-acao="fechar-importar"/);
});

// --- Quem gastou (pessoa) ---

test('renderNovoLancamento traz campo de pessoa com sugestões de quem já foi usado', () => {
  const state = estado({
    lancamentos: [
      { id: '1', data: '2026-08-01', tipo: 'despesa', categoria: 'Lazer', descricao: 'x', valorTotal: 10, parcelas: 1, pessoa: 'Ana' },
    ],
  });
  const html = renderNovoLancamento(state, { tipo: 'despesa' });
  assert.match(html, /name="pessoa"/);
  assert.match(html, /list="lista-pessoas"/);
  assert.match(html, /<datalist id="lista-pessoas">[\s\S]*?<option value="Ana">/);
});

test('renderNovoLancamento pré-preenche a pessoa ao editar', () => {
  const html = renderNovoLancamento(estado(), { id: 'a1', tipo: 'despesa', pessoa: 'Bruno' });
  assert.match(html, /name="pessoa"[^>]*value="Bruno"/);
});

test('renderLancamentos mostra quem gastou na linha do lançamento', () => {
  const state = estado({
    lancamentos: [
      { id: '1', data: '2026-08-01', tipo: 'despesa', categoria: 'Lazer', descricao: 'Cinema', valorTotal: 10, parcelas: 1, pessoa: 'Ana' },
    ],
  });
  assert.match(renderLancamentos(state, 2026, 8), /Lazer · Ana/);
});

test('renderLancamentos só mostra o filtro de pessoa depois que alguém foi registrado', () => {
  const semPessoa = estado({
    lancamentos: [{ id: '1', data: '2026-08-01', tipo: 'despesa', categoria: 'Lazer', descricao: 'x', valorTotal: 10, parcelas: 1 }],
  });
  assert.doesNotMatch(renderLancamentos(semPessoa, 2026, 8), /campo-pessoa-filtro/);

  const comPessoa = estado({
    lancamentos: [{ id: '1', data: '2026-08-01', tipo: 'despesa', categoria: 'Lazer', descricao: 'x', valorTotal: 10, parcelas: 1, pessoa: 'Ana' }],
  });
  const html = renderLancamentos(comPessoa, 2026, 8);
  assert.match(html, /id="campo-pessoa-filtro"/);
  assert.match(html, /<option value="Ana"/);
});

test('renderLancamentos marca a pessoa selecionada no filtro', () => {
  const state = estado({
    lancamentos: [
      { id: '1', data: '2026-08-01', tipo: 'despesa', categoria: 'Lazer', descricao: 'x', valorTotal: 10, parcelas: 1, pessoa: 'Ana' },
      { id: '2', data: '2026-08-02', tipo: 'despesa', categoria: 'Lazer', descricao: 'y', valorTotal: 10, parcelas: 1, pessoa: 'Bruno' },
    ],
  });
  const html = renderLancamentos(state, 2026, 8, { pessoaSelecionada: 'Bruno' });
  assert.match(html, /<option value="Bruno" selected>/);
  assert.match(html, />y</);
  assert.doesNotMatch(html, />x</);
});

test('renderLancamentos e renderNovoLancamento escapam o nome da pessoa', () => {
  const nome = '<img src=x onerror=alert(1)>';
  const state = estado({
    lancamentos: [{ id: '1', data: '2026-08-01', tipo: 'despesa', categoria: 'Lazer', descricao: 'x', valorTotal: 10, parcelas: 1, pessoa: nome }],
  });
  const lista = renderLancamentos(state, 2026, 8);
  assert.equal(lista.includes('<img src=x'), false);
  assert.match(lista, /&lt;img/);

  const form = renderNovoLancamento(state, { pessoa: nome });
  assert.equal(form.includes('<img src=x'), false);
});

// --- Alertas no Resumo ---

function estadoComAlerta() {
  return estado({
    metas: [{ id: 'm1', categoria: 'Lazer', limite: 100 }],
    lancamentos: [
      { id: '1', data: '2026-08-01', tipo: 'despesa', categoria: 'Lazer', descricao: 'Bar', valorTotal: 180, parcelas: 1 },
    ],
  });
}

test('renderResumo mostra o bloco de alertas quando há o que avisar', () => {
  const html = renderResumo(estadoComAlerta(), 2026, 8);
  assert.match(html, /Fique de olho/);
  assert.match(html, /Lazer passou da meta/);
  assert.match(html, /80,00 acima do limite/);
});

test('renderResumo não mostra bloco de alertas nenhum quando está tudo em ordem', () => {
  const html = renderResumo(estado(), 2026, 8);
  assert.doesNotMatch(html, /nv-alerta/);
});

test('renderResumo marca visualmente o alerta crítico', () => {
  const html = renderResumo(estadoComAlerta(), 2026, 8);
  assert.match(html, /nv-alerta--critico/);
});

test('renderResumo escapa o nome da meta no alerta', () => {
  const state = estado({
    metas: [{ id: 'm1', categoria: 'Lazer', nome: '<img src=x onerror=alert(1)>', limite: 100 }],
    lancamentos: [{ id: '1', data: '2026-08-01', tipo: 'despesa', categoria: 'Lazer', descricao: 'x', valorTotal: 180, parcelas: 1 }],
  });
  const html = renderResumo(state, 2026, 8);
  assert.equal(html.includes('<img src=x'), false);
  assert.match(html, /&lt;img/);
});

test('renderAtivoDetalhe mostra a marca de reserva de emergência quando o ativo é reserva', () => {
  const comReserva = estado({
    investimentos: [
      { id: 'i1', nome: 'CDB', tipo: 'renda_fixa', reserva: true, precoAtual: 5000, operacoes: [{ id: 'o1', tipo: 'compra', data: '2026-01-01', quantidade: 1, precoUnitario: 5000 }] },
    ],
  });
  assert.match(renderAtivoDetalhe(comReserva, 'i1'), /RESERVA DE EMERG/i);

  const semReserva = estado({
    investimentos: [
      { id: 'i1', nome: 'CDB', tipo: 'renda_fixa', precoAtual: 5000, operacoes: [{ id: 'o1', tipo: 'compra', data: '2026-01-01', quantidade: 1, precoUnitario: 5000 }] },
    ],
  });
  assert.doesNotMatch(renderAtivoDetalhe(semReserva, 'i1'), /RESERVA DE EMERG/i);
});

// --- Subcategorias na interface ---

const lancComSub = [
  { id: '1', data: '2026-08-01', tipo: 'despesa', categoria: 'Alimentação', subcategoria: 'Mercado', descricao: 'Compras', valorTotal: 500, parcelas: 1 },
  { id: '2', data: '2026-08-02', tipo: 'despesa', categoria: 'Alimentação', subcategoria: 'Restaurante', descricao: 'Almoço', valorTotal: 300, parcelas: 1 },
  { id: '3', data: '2026-08-03', tipo: 'despesa', categoria: 'Alimentação', descricao: 'Padaria', valorTotal: 100, parcelas: 1 },
];

test('renderNovoLancamento traz campo de subcategoria com as já usadas na categoria', () => {
  const html = renderNovoLancamento(estado({ lancamentos: lancComSub }), { tipo: 'despesa', categoria: 'Alimentação' });
  assert.match(html, /name="subcategoria"/);
  assert.match(html, /<datalist id="lista-subcategorias">[\s\S]*?<option value="Mercado">/);
  assert.match(html, /<option value="Restaurante">/);
});

test('renderNovoLancamento pré-preenche a subcategoria ao editar', () => {
  const html = renderNovoLancamento(estado(), { id: 'a1', tipo: 'despesa', categoria: 'Lazer', subcategoria: 'Cinema' });
  assert.match(html, /name="subcategoria"[^>]*value="Cinema"/);
});

test('renderLancamentos mostra a subcategoria depois da categoria', () => {
  const html = renderLancamentos(estado({ lancamentos: lancComSub }), 2026, 8);
  assert.match(html, /Alimentação › Mercado/);
  // lançamento sem subcategoria continua mostrando só a categoria
  assert.match(html, /<div class="nv-item-meta">Alimentação<\/div>/);
});

test('renderCategoriaDetalhe abre a quebra por subcategoria', () => {
  const html = renderCategoriaDetalhe(estado({ lancamentos: lancComSub }), 'Alimentação', 2026, 8);
  assert.match(html, /POR SUBCATEGORIA/);
  assert.match(html, /Mercado/);
  assert.match(html, /Restaurante/);
  assert.match(html, /Sem subcategoria/);
});

test('renderCategoriaDetalhe não mostra a seção quando ninguém usou subcategoria', () => {
  const state = estado({
    lancamentos: [{ id: '1', data: '2026-08-01', tipo: 'despesa', categoria: 'Lazer', descricao: 'x', valorTotal: 10, parcelas: 1 }],
  });
  assert.doesNotMatch(renderCategoriaDetalhe(state, 'Lazer', 2026, 8), /POR SUBCATEGORIA/);
});

test('renderCategoriaDetalhe escapa a subcategoria', () => {
  const state = estado({
    lancamentos: [
      { id: '1', data: '2026-08-01', tipo: 'despesa', categoria: 'Lazer', subcategoria: '<img src=x onerror=alert(1)>', descricao: 'x', valorTotal: 10, parcelas: 1 },
    ],
  });
  const html = renderCategoriaDetalhe(state, 'Lazer', 2026, 8);
  assert.equal(html.includes('<img src=x'), false);
  assert.match(html, /&lt;img/);
});

test('renderMetas mede a meta de subcategoria só pela subcategoria', () => {
  const state = estado({
    lancamentos: lancComSub,
    metas: [{ id: 'm1', categoria: 'Alimentação', subcategoria: 'Restaurante', limite: 200 }],
  });
  const html = renderMetas(state, 2026, 8);
  assert.match(html, /Alimentação › Restaurante/);
  assert.match(html, /300,00 \/ 200,00/); // gasto do Restaurante, não os 900 da categoria
  assert.match(html, /Excedeu/);
});

test('renderMetas continua medindo a categoria inteira quando a meta não tem subcategoria', () => {
  const state = estado({ lancamentos: lancComSub, metas: [{ id: 'm1', categoria: 'Alimentação', limite: 2000 }] });
  assert.match(renderMetas(state, 2026, 8), /900,00 \/ 2\.000,00/);
});

test('renderImportarPlanilha oferece o mapeamento de subcategoria', () => {
  const imp = {
    colunas: ['data', 'valor', 'categoria', 'subcategoria'],
    linhas: [['01/08/2026', '10', 'a', 'b']],
    sugestao: { data: 0, valor: 1, categoria: 2, subcategoria: 3, descricao: null, parcelas: null, conta: null },
  };
  const html = renderImportarPlanilha(estado(), imp);
  assert.match(html, /<select id="map-subcategoria">[\s\S]*?<option value="3" selected>/);
});

test('renderMetas nao conta o limite duas vezes quando ha meta de categoria e de subcategoria', () => {
  const state = estado({
    lancamentos: [
      { id: '1', data: '2026-08-01', tipo: 'despesa', categoria: 'Alimentação', subcategoria: 'iFood', descricao: 'x', valorTotal: 300, parcelas: 1 },
      { id: '2', data: '2026-08-02', tipo: 'despesa', categoria: 'Lazer', descricao: 'y', valorTotal: 5000, parcelas: 1 },
    ],
    metas: [
      { id: 'm1', categoria: 'Alimentação', limite: 1000 },
      { id: 'm2', categoria: 'Alimentação', subcategoria: 'iFood', limite: 100 },
    ],
  });
  // formatCurrency separa "R$" do número com NBSP (ver o teste de formatCurrency) — normaliza antes.
  const html = renderMetas(state, 2026, 8).replace(/\s/g, ' ');
  // orçamento: só a meta da categoria entra no total (1.000, não 1.100), e o gasto considerado
  // é o das metas — os 5.000 de Lazer, que não tem meta, ficam de fora do "orçamento usado".
  assert.match(html, /R\$ 300,00 de R\$ 1\.000,00/);
  assert.match(html, />30</);
});

test('renderNovoLancamento sugere subcategorias da categoria que o combo exibe por padrao', () => {
  // Lancamento novo nao tem categoria no rascunho, mas o combo ja mostra a primeira da lista
  // (Moradia): a sugestao tem que seguir essa, e nao a de outra categoria qualquer.
  const state = estado({
    lancamentos: [
      { id: '1', data: '2026-08-01', tipo: 'despesa', categoria: 'Alimentação', subcategoria: 'Mercado', descricao: 'x', valorTotal: 10, parcelas: 1 },
      { id: '2', data: '2026-08-02', tipo: 'despesa', categoria: 'Moradia', subcategoria: 'Luz', descricao: 'y', valorTotal: 10, parcelas: 1 },
    ],
  });
  const html = renderNovoLancamento(state, { tipo: 'despesa' });
  assert.match(html, /<datalist id="lista-subcategorias">[\s\S]*?<option value="Luz">/);
  assert.doesNotMatch(html, /<datalist id="lista-subcategorias">[\s\S]*?<option value="Mercado">/);
});

// --- Compatibilidade com dado gravado antes desta leva de features ---
// Estado no formato que o app produzia antes de existirem pessoa, subcategoria e reserva. É o que
// está publicado no state.json de quem já usa o app, então nenhuma tela pode quebrar nem mudar de
// número por causa de campo que esses registros não têm.

const ESTADO_LEGADO = {
  lancamentos: [
    { id: 'l1', data: '2026-08-05', tipo: 'receita', categoria: 'Salário', descricao: 'Salário', valorTotal: 5000, parcelas: 1, contaId: 'c1' },
    { id: 'l2', data: '2026-08-07', tipo: 'despesa', categoria: 'Moradia', descricao: 'Aluguel', valorTotal: 1500, parcelas: 1, contaId: 'c1' },
    { id: 'l3', data: '2026-08-10', tipo: 'despesa', categoria: 'Outras Despesas', descricao: 'Notebook', valorTotal: 3600, parcelas: 12, contaId: 'c1' },
    { id: 'l4', data: '2026-08-11', tipo: 'transferencia', categoria: 'Outras Despesas', descricao: 'Fatura', valorTotal: 800, parcelas: 1, contaId: 'c1' },
  ],
  investimentos: [
    { id: 'i1', nome: 'PETR4', tipo: 'acao', precoAtual: 40, operacoes: [{ id: 'o1', tipo: 'compra', data: '2026-01-02', quantidade: 100, precoUnitario: 30 }], proventos: [{ id: 'p1', tipo: 'dividendo', data: '2026-07-01', valor: 120 }] },
    { id: 'i2', nome: 'CDB', tipo: 'renda_fixa', precoAtual: 10000, operacoes: [{ id: 'o2', tipo: 'compra', data: '2026-01-02', quantidade: 1, precoUnitario: 10000 }] },
  ],
  contas: [{ id: 'c1', nome: 'Nubank', tipo: 'conta', fechamento: 10 }],
  metas: [{ id: 'm1', categoria: 'Moradia', nome: 'Aluguel', limite: 2000 }],
  dividas: [{ id: 'd1', nome: 'Carro', tipo: 'financiamento_veiculo', saldoDevedor: 32000, valorParcela: 950, parcelasRestantes: 36 }],
  alocacaoAlvo: { acao: 60, renda_fixa: 40 },
  tema: 'escuro',
  ocultarValores: false,
  idioma: 'pt',
};

const legado = () => JSON.parse(JSON.stringify(ESTADO_LEGADO));

test('estado legado renderiza todas as telas sem lançar erro', () => {
  const s = legado();
  assert.doesNotThrow(() => {
    renderResumo(s, 2026, 8);
    renderLancamentos(s, 2026, 8);
    renderNovoLancamento(s, { tipo: 'despesa' });
    renderNovoLancamento(s, s.lancamentos[1]); // edição de lançamento antigo
    renderCategoriaDetalhe(s, 'Moradia', 2026, 8);
    renderMetas(s, 2026, 8);
    renderInvestimentos(s);
    renderAtivoDetalhe(s, 'i1');
    renderCalendario(s, 2026, 8, 'pt');
    renderDiaDetalhe(s, '2026-08-07', 'pt');
    renderConfiguracoes(s, false);
    renderImportarPlanilha(s, null);
  });
});

test('estado legado: nenhuma tela inventa subcategoria, pessoa ou selo de reserva', () => {
  const s = legado();
  // o "›" é procurado só na linha de meta do item — o cabeçalho usa o mesmo caractere na seta de
  // próximo mês desde antes desta leva, e casar com ele não diria nada sobre subcategoria.
  const linhasMeta = renderLancamentos(s, 2026, 8).match(/<div class="nv-item-meta">[^<]*<\/div>/g) || [];
  assert.ok(linhasMeta.length > 0);
  assert.equal(linhasMeta.some((l) => l.includes('›')), false);
  assert.doesNotMatch(renderLancamentos(s, 2026, 8), /campo-pessoa-filtro/);
  assert.doesNotMatch(renderCategoriaDetalhe(s, 'Moradia', 2026, 8), /POR SUBCATEGORIA/);
  assert.doesNotMatch(renderAtivoDetalhe(s, 'i2'), /RESERVA DE EMERG/i);
});

test('estado legado: alerta de reserva fica calado porque nada foi marcado como reserva', () => {
  const s = legado();
  // 950 de parcela sobre 5.000 de renda = 19%, abaixo das faixas: silêncio é o certo aqui.
  assert.deepEqual(alertasFinanceiros(s, 2026, 8), []);

  // e as regras continuam valendo em dado antigo quando a faixa é de fato ultrapassada
  const apertado = legado();
  apertado.dividas[0].valorParcela = 2000; // 40% da renda
  const ids = alertasFinanceiros(apertado, 2026, 8).map((a) => a.id);
  assert.equal(ids.includes('comprometimento'), true);
  assert.equal(ids.includes('reserva'), false); // segue calado: nenhum ativo marcado
});

test('estado legado: números do mês seguem os mesmos de antes', () => {
  const s = legado();
  const resumo = resumoMensal(s.lancamentos, 2026, 8);
  assert.equal(resumo.receitas, 5000);
  assert.equal(resumo.despesas, 1800); // 1500 + 300 da parcela; transferência fora
  assert.equal(resumo.saldo, 3200);
  assert.equal(totalCarteira(s.investimentos).totalAtual, 14000);
  // meta antiga (sem subcategoria) continua medindo a categoria inteira
  assert.equal(gastoDaMeta(s.lancamentos, s.metas[0], 2026, 8), 1500);
});

test('editar um lançamento antigo preserva os campos que o formulário não conhece', () => {
  // O formulário devolve uma lista fixa de campos; editLancamento faz merge, então nada que o
  // formulário não edita (contaId de outro fluxo, origem de importação) pode ser apagado.
  let s = { ...estadoInicial(), lancamentos: [{ id: 'l1', data: '2026-08-01', tipo: 'despesa', categoria: 'Lazer', descricao: 'Bar', valorTotal: 100, parcelas: 1, origem: 'importacao', campoDeOutraVersao: 'x' }] };
  s = applyAction(s, {
    type: 'editLancamento',
    id: 'l1',
    changes: { data: '2026-08-02', descricao: 'Bar do Zé', categoria: 'Lazer', subcategoria: '', pessoa: '', tipo: 'despesa', valorTotal: 120, contaId: null, parcelas: 1 },
  });
  const l = s.lancamentos[0];
  assert.equal(l.valorTotal, 120);
  assert.equal(l.origem, 'importacao');
  assert.equal(l.campoDeOutraVersao, 'x');
});

test('renderMetas nao conta o mesmo gasto duas vezes com duas metas na mesma categoria', () => {
  const state = estado({
    lancamentos: [{ id: '1', data: '2026-08-01', tipo: 'despesa', categoria: 'Lazer', descricao: 'x', valorTotal: 600, parcelas: 1 }],
    metas: [
      { id: 'm1', categoria: 'Lazer', nome: 'Bar', limite: 500 },
      { id: 'm2', categoria: 'Lazer', nome: 'Cinema', limite: 500 },
    ],
  });
  const html = renderMetas(state, 2026, 8).replace(/\s/g, ' ');
  // os 600 gastos entram uma vez so, contra a soma dos dois limites
  assert.match(html, /R\$ 600,00 de R\$ 1\.000,00/);
  assert.match(html, />60</);
});

test('renderNovoLancamento sugere subcategoria da categoria valida para o tipo escolhido', () => {
  // Moradia nao existe em receita: o combo cai em "Salario", e a sugestao tem que acompanhar,
  // senao o campo mostra uma categoria e sugere subcategoria de outra.
  const state = estado({
    lancamentos: [
      { id: '1', data: '2026-08-01', tipo: 'despesa', categoria: 'Moradia', subcategoria: 'Luz', descricao: 'x', valorTotal: 10, parcelas: 1 },
      { id: '2', data: '2026-08-02', tipo: 'receita', categoria: 'Salário', subcategoria: 'Bônus', descricao: 'y', valorTotal: 10, parcelas: 1 },
    ],
  });
  const html = renderNovoLancamento(state, { tipo: 'receita', categoria: 'Moradia' });
  assert.match(html, /<datalist id="lista-subcategorias">[\s\S]*?<option value="Bônus">/);
  assert.doesNotMatch(html, /<datalist id="lista-subcategorias">[\s\S]*?<option value="Luz">/);
});

test('grafico de composicao cabe inteiro no viewBox, sem cortar a espessura do traco', () => {
  const state = estado({
    investimentos: [
      { id: 'i1', nome: 'A', tipo: 'acao', precoAtual: 60, operacoes: [{ id: 'o1', tipo: 'compra', data: '2026-01-01', quantidade: 1, precoUnitario: 60 }] },
      { id: 'i2', nome: 'B', tipo: 'fii', precoAtual: 40, operacoes: [{ id: 'o2', tipo: 'compra', data: '2026-01-01', quantidade: 1, precoUnitario: 40 }] },
    ],
  });
  const html = renderInvestimentos(state);
  const svg = html.match(/<svg[^>]*viewBox="0 0 (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"[\s\S]*?<\/svg>/);
  assert.ok(svg, 'svg do grafico encontrado');
  const [largura, altura] = [Number(svg[1]), Number(svg[2])];

  const circulos = [...svg[0].matchAll(/<circle cx="([\d.]+)" cy="([\d.]+)" r="([\d.]+)"[^>]*stroke-width="([\d.]+)"/g)];
  assert.ok(circulos.length >= 2, 'trilha de fundo + segmentos');
  for (const [, cx, cy, r, w] of circulos) {
    // O traco fica centrado no raio: metade dele passa pra fora.
    const bordaExterna = Number(r) + Number(w) / 2;
    assert.ok(Number(cx) - bordaExterna >= 0, `corta a esquerda: ${Number(cx) - bordaExterna}`);
    assert.ok(Number(cy) - bordaExterna >= 0, `corta em cima: ${Number(cy) - bordaExterna}`);
    assert.ok(Number(cx) + bordaExterna <= largura, `corta a direita: ${largura - (Number(cx) + bordaExterna)}`);
    assert.ok(Number(cy) + bordaExterna <= altura, `corta embaixo: ${altura - (Number(cy) + bordaExterna)}`);
  }
});

test('renderCalendario permite navegar entre meses, como as outras telas', () => {
  const html = renderCalendario(estado(), 2026, 8, 'pt');
  assert.match(html, /data-acao="mes-anterior"/);
  assert.match(html, /data-acao="mes-seguinte"/);
  assert.match(html, /AGOSTO 2026/);
});
