const test = require('node:test');
const assert = require('node:assert/strict');
const {
  formatCurrency,
  formatPercent,
  renderResumo,
  renderLancamentos,
  renderNovoLancamento,
  renderCategoriaDetalhe,
  renderMetas,
  renderConfiguracoes,
  renderAbertura,
  renderInvestimentos,
  renderAtivoDetalhe,
  renderPin,
  renderComboSelect,
  renderComboBusca,
} = require('./render.js');
const { estadoInicial } = require('./logic.js');
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

test('renderResumo lista parcelas em aberto do mês', () => {
  const state = estado({
    lancamentos: [
      { id: '1', data: '2026-08-10', descricao: 'Notebook', tipo: 'despesa', categoria: 'Outras Despesas', valorTotal: 3600, parcelas: 12 },
    ],
  });
  const html = renderResumo(state, 2026, 9);
  assert.match(html, /Notebook/);
  assert.match(html, /2\/12/);
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
