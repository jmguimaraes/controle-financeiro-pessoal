const L = typeof require !== 'undefined' ? require('./logic.js') : window;
const I18N = typeof require !== 'undefined' ? require('./i18n.js') : window;

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const MESES_ABREV = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

const ROTULOS_TIPO_INVESTIMENTO = {
  acao: 'Ação',
  fii: 'Fundo Imobiliário',
  fundo_investimento: 'Fundo de Investimento',
  criptomoeda: 'Criptomoeda',
  stock: 'Stock',
  reit: 'REIT',
  bdr: 'BDR',
  etf: 'ETF',
  etf_internacional: 'ETF Internacional',
  tesouro_direto: 'Tesouro Direto',
  renda_fixa: 'Renda Fixa',
  outro: 'Outro',
};

// Rótulo pra grupos sintéticos que não são um tipo de ativo de verdade selecionável no
// formulário (hoje só o "Outros" que a composição da carteira usa pra agrupar o 7º tipo em
// diante) — fica fora de ROTULOS_TIPO_INVESTIMENTO de propósito, senão viraria uma opção
// escolhível ao criar um ativo.
const ROTULOS_GRUPO_SINTETICO = {
  outros_agrupados: 'Outros',
};

function rotuloTipoInvestimento(tipo) {
  return ROTULOS_TIPO_INVESTIMENTO[tipo] || ROTULOS_GRUPO_SINTETICO[tipo] || tipo;
}

const ROTULOS_TIPO_CONTA = {
  cartao: 'Cartão',
  conta: 'Conta corrente',
  carteira: 'Carteira',
};

const OCULTO = '••••';

// idioma é opcional (default português) — o valor em si nunca deixa de ser real brasileiro
// (não tem conversão de moeda aqui), só o separador de milhar/decimal e a posição do "R$" mudam
// pra convenção de cada idioma. currencyDisplay:'narrowSymbol' garante "R$" nos três idiomas —
// sem isso o ICU mostra "BRL" por extenso em espanhol em vez do símbolo.
function formatCurrency(valor, idioma) {
  return new Intl.NumberFormat(I18N.localeDoIdioma(idioma), { style: 'currency', currency: 'BRL', currencyDisplay: 'narrowSymbol' }).format(valor);
}

function formatNumero(valor, idioma) {
  return new Intl.NumberFormat(I18N.localeDoIdioma(idioma), { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(valor);
}

function formatPercent(valor, idioma) {
  const formatado = formatNumero(valor, idioma);
  return `${valor >= 0 ? '+' : ''}${formatado}%`;
}

// Anos aparecem com uma casa decimal só (18,2 anos), diferente de formatNumero, que sempre usa
// duas. Passa pelo Intl para o separador acompanhar o idioma — toFixed devolveria sempre ponto.
function formatAnos(valor, idioma) {
  return new Intl.NumberFormat(I18N.localeDoIdioma(idioma), { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(valor);
}

function escapeHtml(texto) {
  return String(texto)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Esconde valores monetários quando state.ocultarValores está ativo, mantendo a largura tabular.
function mascarar(textoFormatado, ocultarValores) {
  return ocultarValores ? OCULTO : textoFormatado;
}

function iconSymbol(size = 20, corTraco = 'currentColor', corLaje = 'var(--nv-accent)') {
  return `<svg width="${size}" height="${size}" viewBox="0 0 20 20" aria-hidden="true"><rect x="1" y="1" width="18" height="18" rx="4" fill="none" stroke="${corTraco}" stroke-width="2"></rect><path d="M4 16 L16 4 L16 9.5 L9.5 16 Z" fill="${corLaje}"></path></svg>`;
}

// Função (não const) de propósito — no bundle do navegador (script clássico, sem módulos),
// `function` no nível superior vira propriedade de window automaticamente, mas `const` não.
// ROTULOS_TIPO_INVESTIMENTO sozinho não estaria acessível via `renderizacao.` no app.js.
function opcoesTipoInvestimento() {
  return Object.entries(ROTULOS_TIPO_INVESTIMENTO).map(([valor, rotulo]) => ({ valor, rotulo }));
}

// Combobox custom (dropdown com fundo/cor de seleção controlados pelo app) — substitui
// <select>/<datalist> nativos, cujo popup o navegador não deixa estilizar de forma confiável
// entre navegadores/SOs (ver commits anteriores tentando resolver isso via CSS só).
function renderComboItens(opcoes, valorAtual) {
  return opcoes.length
    ? opcoes
        .map(
          (o) =>
            `<div class="nv-combo-item ${o.valor === valorAtual ? 'ativo' : ''}" data-acao="selecionar-combo-item" data-valor="${escapeHtml(o.valor)}" data-rotulo="${escapeHtml(o.rotulo || o.valor)}">${escapeHtml(o.rotulo || o.valor)}</div>`
        )
        .join('')
    : '<div class="nv-combo-vazio">Nenhuma opção encontrada.</div>';
}

function renderComboSelect(nomeCampo, opcoes, valorAtual, idElemento) {
  const atual = opcoes.find((o) => o.valor === valorAtual) || opcoes[0] || { valor: '', rotulo: '' };
  return `
    <div class="nv-combo" data-combo="${nomeCampo}">
      <input type="hidden" name="${nomeCampo}" value="${escapeHtml(atual.valor)}" />
      <button type="button" ${idElemento ? `id="${idElemento}"` : ''} class="nv-combo-gatilho" data-acao="abrir-combo">
        <span class="nv-combo-valor">${escapeHtml(atual.rotulo)}</span>
        <svg class="nv-combo-seta" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><polyline points="6 9 12 15 18 9"></polyline></svg>
      </button>
      <div class="nv-combo-lista" hidden>${renderComboItens(opcoes, atual.valor)}</div>
    </div>`;
}

function renderComboBusca(nomeCampo, valorInicial, sugestoes, idElemento) {
  return `
    <div class="nv-combo" data-combo="${nomeCampo}">
      <input type="text" ${idElemento ? `id="${idElemento}"` : ''} name="${nomeCampo}" class="nv-combo-input" autocomplete="off" required maxlength="40" value="${escapeHtml(valorInicial || '')}" />
      <div class="nv-combo-lista" hidden>${(sugestoes || [])
        .map((t) => `<div class="nv-combo-item" data-acao="selecionar-combo-item" data-valor="${escapeHtml(t)}">${escapeHtml(t)}</div>`)
        .join('')}<div class="nv-combo-vazio" ${(sugestoes || []).length ? 'hidden' : ''}>Nenhuma sugestão — pode digitar o nome livremente.</div></div>
    </div>`;
}

function iconSearch() {
  return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><line x1="16.5" y1="16.5" x2="21" y2="21"></line></svg>';
}

// Paleta fixa e propositalmente discreta (tons médios, baixa saturação) pra não brigar com a
// identidade monocromática + acento do resto do app — serve só pra diferenciar ativos visualmente
// numa lista, não é uma paleta categórica de gráfico. Ordem fixa, nunca gerada dinamicamente.
const PALETA_MONOGRAMA = ['#6b7a99', '#a1665e', '#6b8f71', '#8a6b9c', '#9c8465', '#6ba1a1', '#a17f6b', '#7a7a9c'];

// Não pode carregar o logo de marca de nenhum ativo (CSP do Artifact bloqueia fetch externo, e
// reproduzir a arte de uma empresa sem licença seria problema de marca registrada de qualquer
// forma) — em vez disso, cada ativo ganha duas letras + uma cor sempre igual pra aquele nome.
function monogramaAtivo(nome, tamanho = 32) {
  const iniciais = L.iniciaisAtivo(nome);
  const cor = PALETA_MONOGRAMA[L.corIndiceAtivo(nome, PALETA_MONOGRAMA.length)];
  const fonte = Math.round(tamanho * 0.4);
  return `<span class="nv-monograma" style="width:${tamanho}px;height:${tamanho}px;font-size:${fonte}px;background:${cor}" aria-hidden="true">${escapeHtml(iniciais)}</span>`;
}

function iconCalculator(size = 18) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="2" width="16" height="20" rx="2"></rect><line x1="8" y1="6" x2="16" y2="6"></line><line x1="8" y1="10" x2="8" y2="10.01"></line><line x1="12" y1="10" x2="12" y2="10.01"></line><line x1="16" y1="10" x2="16" y2="10.01"></line><line x1="8" y1="14" x2="8" y2="14.01"></line><line x1="12" y1="14" x2="12" y2="14.01"></line><line x1="16" y1="14" x2="16" y2="14.01"></line><line x1="8" y1="18" x2="8" y2="18.01"></line><line x1="12" y1="18" x2="12" y2="18.01"></line><line x1="16" y1="18" x2="16" y2="18.01"></line></svg>`;
}

function iconSol(size = 16) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"></circle><line x1="12" y1="2" x2="12" y2="4"></line><line x1="12" y1="20" x2="12" y2="22"></line><line x1="4.2" y1="4.2" x2="5.6" y2="5.6"></line><line x1="18.4" y1="18.4" x2="19.8" y2="19.8"></line><line x1="2" y1="12" x2="4" y2="12"></line><line x1="20" y1="12" x2="22" y2="12"></line><line x1="4.2" y1="19.8" x2="5.6" y2="18.4"></line><line x1="18.4" y1="5.6" x2="19.8" y2="4.2"></line></svg>`;
}

function iconLua(size = 16) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;
}

function iconMonitor(size = 16) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="3" width="20" height="14" rx="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>`;
}

function iconGear(size = 18) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>`;
}

function tabBar(abaAtiva, idioma) {
  const itens = [
    { id: 'resumo', rotulo: I18N.t('tabs.resumo', idioma) },
    { id: 'lancamentos', rotulo: I18N.t('tabs.lancamentos', idioma) },
    { id: 'carteira', rotulo: I18N.t('tabs.carteira', idioma) },
    { id: 'metas', rotulo: I18N.t('tabs.metas', idioma) },
    { id: 'calendario', rotulo: 'CALEND.' },
  ];
  return `
    <nav class="nv-tabbar">
      ${itens
        .map(
          (item) => `
        <button type="button" data-acao="ir-tab" data-tab="${item.id}" class="${item.id === abaAtiva ? 'ativo' : ''}">${item.rotulo}</button>`
        )
        .join('')}
    </nav>`;
}

function headerResumo(ano, mes, idioma) {
  const meses = I18N.mesesDoIdioma(idioma);
  return `
    <div class="nv-header nv-header--brand">
      <div class="nv-brand">
        ${iconSymbol(26)}
        <span class="nv-wordmark">NUVRA</span>
      </div>
      <div class="nv-monthnav">
        <button type="button" data-acao="mes-anterior" aria-label="${I18N.t('header.mesAnterior', idioma)}">${'‹'}</button>
        <span>${meses[mes - 1].slice(0, 3).toUpperCase()} ${ano}</span>
        <button type="button" data-acao="mes-seguinte" aria-label="${I18N.t('header.mesSeguinte', idioma)}">${'›'}</button>
        <button type="button" class="nv-gear" data-acao="abrir-calculadoras" aria-label="${I18N.t('header.calculadoras', idioma)}">${iconCalculator(19)}</button>
        <button type="button" class="nv-gear" data-acao="abrir-configuracoes" aria-label="${I18N.t('header.configuracoes', idioma)}">${iconGear(19)}</button>
      </div>
    </div>`;
}

function headerTituloMes(titulo, ano, mes) {
  return `
    <div class="nv-header">
      <span class="nv-title">${titulo}</span>
      <div class="nv-monthnav">
        <button type="button" data-acao="mes-anterior" aria-label="Mês anterior">${'‹'}</button>
        <span>${MESES[mes - 1].toUpperCase()} ${ano}</span>
        <button type="button" data-acao="mes-seguinte" aria-label="Próximo mês">${'›'}</button>
      </div>
    </div>`;
}

function headerVoltar(titulo, acaoVoltar) {
  return `
    <div class="nv-header nv-header--back">
      <button type="button" class="nv-back" data-acao="${acaoVoltar}" aria-label="Voltar">${'‹'}</button>
      <span class="nv-title">${titulo}</span>
    </div>`;
}

function sparkline(pontos) {
  const valores = pontos.map((p) => p.saldo);
  const min = Math.min(0, ...valores);
  const max = Math.max(0, ...valores);
  const amplitude = max - min || 1;
  const largura = 350;
  const altura = 90;
  const passo = pontos.length > 1 ? largura / (pontos.length - 1) : 0;
  const coords = pontos.map((p, i) => {
    const x = i * passo;
    const y = altura - 6 - ((p.saldo - min) / amplitude) * (altura - 16);
    return { x, y };
  });
  const linha = coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
  const ultimo = coords[coords.length - 1];
  const eixo = pontos.map((p) => `<span>${MESES_ABREV[p.mes - 1]}</span>`).join('');
  return `
    <div class="nv-sparkline">
      <svg viewBox="0 0 ${largura} ${altura}" width="100%" height="${altura}" preserveAspectRatio="none" aria-hidden="true">
        <line x1="0" y1="${altura - 1}" x2="${largura}" y2="${altura - 1}" stroke="var(--nv-rule-soft)" stroke-width="1"></line>
        <polyline points="${linha}" fill="none" stroke="var(--nv-accent)" stroke-width="2"></polyline>
        <rect x="${(ultimo.x - 5).toFixed(1)}" y="${(ultimo.y - 5).toFixed(1)}" width="10" height="10" fill="var(--nv-accent)"></rect>
      </svg>
      <div class="nv-sparkline-axis">${eixo}</div>
    </div>`;
}

function renderResumo(state, ano, mes) {
  const idioma = state.idioma;
  const investimentos = state.investimentos || [];
  const ocultar = !!state.ocultarValores;
  const resumo = L.resumoMensal(state.lancamentos, ano, mes);
  const carteira = L.totalCarteira(investimentos);
  const abertas = L.parcelasEmAberto(state.lancamentos, ano, mes);
  const historico = L.resumoUltimosMeses(state.lancamentos, ano, mes, 7);
  const anterior = historico[historico.length - 2];
  const variacao = anterior ? resumo.saldo - anterior.saldo : 0;
  const categorias = L.gastosPorCategoria(state.lancamentos, ano, mes).slice(0, 3);
  const maiorCategoria = categorias.length ? categorias[0].valor : 0;
  const meses = I18N.mesesDoIdioma(idioma);

  const barrasCategoria = categorias.length
    ? categorias
        .map(
          (c, i) => `
        <button type="button" class="nv-bar-row" data-acao="abrir-categoria" data-categoria="${escapeHtml(c.categoria)}">
          <div class="nv-bar-top"><span>${escapeHtml(c.categoria)}</span><span>${mascarar(formatNumero(c.valor, idioma), ocultar)}</span></div>
          <div class="nv-bar-track"><div class="nv-bar-fill" style="width:${maiorCategoria ? (c.valor / maiorCategoria) * 100 : 0}%;background:${i === 0 ? 'var(--nv-accent)' : 'var(--nv-bar-neutral-strong)'}"></div></div>
        </button>`
        )
        .join('')
    : `<p class="nv-vazio">${I18N.t('resumo.semDespesas', idioma)}</p>`;

  const listaParcelas = abertas.length
    ? abertas
        .map(
          (p) => `
        <div class="nv-row-plain">
          <span>${escapeHtml(p.descricao)} <small>${p.numeroParcela}/${p.parcelas}</small></span>
          <span>${mascarar(formatNumero(p.valorParcela, idioma), ocultar)}</span>
        </div>`
        )
        .join('')
    : `<p class="nv-vazio">${I18N.t('resumo.semParcelas', idioma)}</p>`;

  return `
    ${headerResumo(ano, mes, idioma)}
    <div class="nv-hero">
      <div class="nv-hero-label">${I18N.t('resumo.saldoDoMes', idioma)}</div>
      <div class="nv-hero-value">
        <span class="cifrao">R$</span>
        <span class="numero">${mascarar(formatNumero(resumo.saldo, idioma), ocultar)}</span>
      </div>
      <div class="nv-hero-sub">${variacao >= 0 ? '+' : '−'} ${mascarar(formatCurrency(Math.abs(variacao), idioma), ocultar)} ${I18N.t('resumo.emRelacaoA', idioma)} ${meses[(mes - 2 + 12) % 12].toLowerCase()}</div>
    </div>
    ${sparkline(historico)}
    ${renderEntradaRapida()}
    <div class="nv-cells">
      <div class="nv-cell">
        <div class="nv-cell-label">${I18N.t('resumo.receitas', idioma)}</div>
        <div class="nv-cell-valor">${mascarar(formatNumero(resumo.receitas, idioma), ocultar)}</div>
      </div>
      <div class="nv-cell">
        <div class="nv-cell-label">${I18N.t('resumo.despesas', idioma)}</div>
        <div class="nv-cell-valor" style="color:var(--nv-negative)">${mascarar(formatNumero(resumo.despesas, idioma), ocultar)}</div>
      </div>
      <div class="nv-cell">
        <div class="nv-cell-label">${I18N.t('resumo.carteira', idioma)}</div>
        <div class="nv-cell-valor">${mascarar(formatNumero(carteira.totalAtual, idioma), ocultar)}</div>
      </div>
    </div>
    <div class="nv-section-head">
      <span class="nv-section-label">${I18N.t('resumo.gastosPorCategoria', idioma)}</span>
      <button type="button" class="nv-link-accent" data-acao="ir-tab" data-tab="lancamentos">${I18N.t('resumo.verTudo', idioma)}</button>
    </div>
    <div class="nv-bars">${barrasCategoria}</div>
    <div class="nv-section-head">
      <span class="nv-section-label">${I18N.t('resumo.parcelasEmAberto', idioma)}</span>
    </div>
    <div class="nv-list-plain">${listaParcelas}</div>
    ${tabBar('resumo', idioma)}
  `;
}

function agruparPorDia(itens) {
  const grupos = [];
  let atual = null;
  for (const item of itens) {
    if (!atual || atual.data !== item.data) {
      atual = { data: item.data, itens: [] };
      grupos.push(atual);
    }
    atual.itens.push(item);
  }
  return grupos;
}

function rotuloData(dataISO) {
  const [ano, mes, dia] = dataISO.split('-');
  return `${dia} DE ${MESES[Number(mes) - 1].toUpperCase()}`;
}

function renderLancamentos(state, ano, mes, opcoes = {}) {
  const ocultar = !!state.ocultarValores;
  const contas = state.contas || [];
  const { busca = '', filtro = 'todos', contaSelecionada = null } = opcoes;
  const itens = L.filtrarLancamentos(state.lancamentos, ano, mes, { busca, filtro, contaId: contaSelecionada });
  const total = L.totalFiltrado(itens);
  const grupos = agruparPorDia(itens);
  const contaAtual = contas.find((c) => c.id === contaSelecionada);

  const chips = [
    { id: 'todos', rotulo: 'TODOS' },
    { id: 'receitas', rotulo: 'RECEITAS' },
    { id: 'despesas', rotulo: 'DESPESAS' },
    { id: 'parcelados', rotulo: 'PARCELADOS' },
  ];

  const listaGrupos = grupos.length
    ? grupos
        .map(
          (grupo) => `
        <div class="nv-grupo-data">${rotuloData(grupo.data)}</div>
        ${grupo.itens
          .map((l) => {
            const tag = l.parcelas > 1 ? `<span class="nv-tag-parcela">${l.numeroParcela}/${l.parcelas}</span>` : '';
            const sinal = l.tipo === 'receita' ? '+' : '−';
            const classe = l.tipo === 'receita' ? 'positivo' : 'negativo';
            const conta = contas.find((c) => c.id === l.contaId);
            const metaConta = conta ? ` · ${escapeHtml(conta.nome)}` : '';
            return `
        <div class="nv-item-lanc" data-id="${l.id}" data-acao="editar-lancamento">
          <div>
            <div class="nv-item-nome">${escapeHtml(l.descricao || l.categoria)}${tag}</div>
            <div class="nv-item-meta">${escapeHtml(l.categoria)}${metaConta}</div>
          </div>
          <div class="nv-item-valor ${classe}">${sinal} ${mascarar(formatNumero(L.parcelaValor(l)), ocultar)}</div>
        </div>`;
          })
          .join('')}`
        )
        .join('')
    : '<p class="nv-vazio">Nenhum lançamento neste mês.</p>';

  return `
    ${headerTituloMes('Lançamentos', ano, mes)}
    <div class="nv-search">
      <div class="nv-search-box">
        ${iconSearch()}
        <input type="search" id="campo-busca-lancamentos" placeholder="Buscar descrição ou categoria" value="${escapeHtml(busca)}" />
      </div>
    </div>
    <div class="nv-chips">
      ${chips
        .map(
          (chip) => `<button type="button" class="nv-chip ${chip.id === filtro ? 'ativo' : ''}" data-acao="filtrar-lancamentos" data-filtro="${chip.id}">${chip.rotulo}</button>`
        )
        .join('')}
    </div>
    <div class="nv-cells nv-cells--linha">
      <div class="nv-cell">
        <div class="nv-cell-label" style="font-size:9px">CONTA</div>
        <select id="campo-conta-filtro" class="nv-select-inline">
          <option value="">Todas</option>
          ${contas.map((c) => `<option value="${c.id}" ${c.id === contaSelecionada ? 'selected' : ''}>${escapeHtml(c.nome)}</option>`).join('')}
        </select>
      </div>
      <div class="nv-cell">
        <div class="nv-cell-label" style="font-size:9px">TOTAL FILTRADO</div>
        <div class="nv-cell-valor" style="font-size:12px">${total >= 0 ? '+' : '−'} ${mascarar(formatCurrency(Math.abs(total)), ocultar)}</div>
      </div>
    </div>
    <div class="nv-grupo-lista">${listaGrupos}</div>
    <div class="nv-acao-fixa">
      <button type="button" class="nv-btn-cheio" data-acao="novo-lancamento">
        <span>NOVO LANÇAMENTO</span><span class="mais">+</span>
      </button>
    </div>
    ${tabBar('lancamentos', state.idioma)}
    ${contaAtual ? '' : ''}
  `;
}

function opcoesCategoria(tipo) {
  const receitas = ['Salário', 'Freelance', 'Investimentos', 'Outras Receitas'];
  const despesas = ['Moradia', 'Alimentação', 'Transporte', 'Saúde', 'Educação', 'Lazer', 'Assinaturas', 'Vestuário', 'Outras Despesas'];
  return (tipo === 'receita' ? receitas : despesas).map((c) => ({ valor: c, rotulo: c }));
}

function renderNovoLancamento(state, dadosIniciais) {
  const contas = state.contas || [];
  const d = dadosIniciais || {};
  const tipo = d.tipo || 'despesa';
  const parcelado = (d.parcelas || 1) > 1;
  const saldoProjetado = d.saldoProjetado ?? 0;

  return `
    <div class="nv-header nv-header--back">
      <span class="nv-title">Lançamento</span>
      <button type="button" class="nv-link-muted" data-acao="cancelar-lancamento">CANCELAR</button>
    </div>
    <form id="formulario-lancamento">
      <input type="hidden" name="id" value="${escapeHtml(d.id || '')}" />
      <div class="nv-segmentado">
        <button type="button" data-acao="tipo-lancamento" data-tipo="despesa" class="${tipo === 'despesa' ? 'ativo' : ''}">DESPESA</button>
        <button type="button" data-acao="tipo-lancamento" data-tipo="receita" class="${tipo === 'receita' ? 'ativo' : ''}">RECEITA</button>
        <button type="button" data-acao="tipo-lancamento" data-tipo="transferencia" class="${tipo === 'transferencia' ? 'ativo' : ''}">TRANSF.</button>
      </div>
      <input type="hidden" name="tipo" value="${tipo}" />
      <div class="nv-valor-grande">
        <div class="nv-cell-label">VALOR TOTAL</div>
        <div class="nv-hero-value">
          <span class="cifrao">R$</span>
          <input type="text" inputmode="decimal" name="valorTotal" class="nv-campo-moeda" required value="${d.valorTotal ? formatNumero(d.valorTotal) : ''}" placeholder="0,00" />
        </div>
      </div>
      <div class="nv-campo-linha">
        <label class="nv-campo-label" for="campo-descricao">DESCRIÇÃO</label>
        <input type="text" id="campo-descricao" name="descricao" maxlength="80" value="${escapeHtml(d.descricao || '')}" />
      </div>
      <div class="nv-campo-linha">
        <label class="nv-campo-label" for="campo-categoria-lancamento">CATEGORIA</label>
        ${renderComboSelect('categoria', opcoesCategoria(tipo), d.categoria, 'campo-categoria-lancamento')}
      </div>
      <div class="nv-campo-dupla">
        <div>
          <label class="nv-campo-label" for="campo-data">DATA</label>
          <input type="date" id="campo-data" name="data" required value="${d.data || ''}" />
        </div>
        <div>
          <label class="nv-campo-label" for="campo-conta">CONTA</label>
          <select id="campo-conta" name="contaId">
            <option value="">Sem conta</option>
            ${contas.map((c) => `<option value="${c.id}" ${c.id === d.contaId ? 'selected' : ''}>${escapeHtml(c.nome)}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="nv-linha-toggle">
        <span>Parcelado</span>
        <label class="nv-switch-wrap">
          <input type="checkbox" name="parcelado" id="campo-parcelado" ${parcelado ? 'checked' : ''} />
          <span class="nv-switch"><span class="knob"></span></span>
        </label>
      </div>
      <div class="nv-linha-toggle nv-stepper-linha ${parcelado ? '' : 'desabilitado'}" id="campo-parcelas-linha">
        <span>Número de parcelas</span>
        <div class="nv-stepper">
          <button type="button" data-acao="parcelas-menos">−</button>
          <span id="valor-parcelas">${d.parcelas && d.parcelas > 1 ? d.parcelas : 2}</span>
          <button type="button" data-acao="parcelas-mais">+</button>
        </div>
        <input type="hidden" name="parcelas" id="campo-parcelas" value="${d.parcelas && d.parcelas > 1 ? d.parcelas : 2}" />
      </div>
      ${
        d.id
          ? `<div class="nv-campo-linha" style="border-top:1px solid var(--nv-rule-soft);border-bottom:none;padding-top:14px">
        <button type="button" class="nv-link-muted" data-acao="excluir-lancamento-atual" style="color:var(--nv-negative)">Excluir lançamento</button>
      </div>`
          : ''
      }
      <div class="nv-rodape-form">
        <div class="nv-rodape-saldo">
          <span>SALDO APÓS SALVAR</span><span>${formatCurrency(saldoProjetado)}</span>
        </div>
        <button type="submit" class="nv-btn-cheio">SALVAR</button>
      </div>
    </form>
  `;
}

function renderCategoriaDetalhe(state, categoria, ano, mes) {
  const ocultar = !!state.ocultarValores;
  const contas = state.contas || [];
  const gastoAtual = L.gastosPorCategoria(state.lancamentos, ano, mes).find((c) => c.categoria === categoria);
  const total = gastoAtual ? gastoAtual.valor : 0;
  const historico = L.gastoCategoriaUltimosMeses(state.lancamentos, categoria, ano, mes, 6);
  const media6 = historico.reduce((s, h) => s + h.valor, 0) / (historico.length || 1);
  const variacao = media6 ? ((total - media6) / media6) * 100 : 0;
  const maiorHistorico = Math.max(1, ...historico.map((h) => h.valor));
  const meta = (state.metas || []).find((m) => m.categoria === categoria);
  const statusMeta = meta ? L.statusMeta(total, meta.limite) : null;
  const itens = L.filtrarLancamentos(state.lancamentos, ano, mes, {}).filter((l) => l.categoria === categoria && l.tipo === 'despesa');

  const barras = historico
    .map(
      (h, i) => `<div class="nv-barra-mes ${i === historico.length - 1 ? 'atual' : ''}" style="height:${Math.max(4, (h.valor / maiorHistorico) * 100)}%"></div>`
    )
    .join('');
  const eixo = historico.map((h) => `<span>${MESES_ABREV[h.mes - 1]}</span>`).join('');

  const listaItens = itens.length
    ? itens
        .map((l) => {
          const conta = contas.find((c) => c.id === l.contaId);
          const dataFmt = l.data.split('-').reverse().slice(0, 2).join('/');
          return `
        <div class="nv-item-lanc" data-id="${l.id}" data-acao="editar-lancamento">
          <div>
            <div class="nv-item-nome">${escapeHtml(l.descricao || l.categoria)}</div>
            <div class="nv-item-meta">${dataFmt}${conta ? ` · ${escapeHtml(conta.nome)}` : ''}</div>
          </div>
          <div class="nv-item-valor">${mascarar(formatNumero(L.parcelaValor(l)), ocultar)}</div>
        </div>`;
        })
        .join('')
    : '<p class="nv-vazio">Nenhum lançamento nesta categoria.</p>';

  return `
    ${headerVoltar(escapeHtml(categoria), 'fechar-categoria')}
    <div class="nv-hero" style="border-bottom:1px solid var(--nv-rule-soft)">
      <div class="nv-hero-label">GASTO EM ${MESES[mes - 1].toUpperCase()}</div>
      <div class="nv-hero-value">
        <span class="cifrao" style="font-size:18px">R$</span>
        <span class="numero" style="font-size:44px">${mascarar(formatNumero(total), ocultar)}</span>
      </div>
      <div class="nv-hero-sub" style="display:flex;gap:16px">
        <span>Média 6 meses ${mascarar(formatCurrency(media6), ocultar)}</span>
        <span style="color:${variacao >= 0 ? 'var(--nv-negative)' : 'var(--nv-positive)'}">${formatPercent(variacao)}</span>
      </div>
    </div>
    <div class="nv-barras-meses">
      <div class="nv-section-label" style="margin-bottom:14px">SEIS MESES</div>
      <div class="nv-barras-meses-grid">${barras}</div>
      <div class="nv-barras-eixo">${eixo}</div>
    </div>
    ${
      meta
        ? `<div class="nv-meta-linha">
      <div>
        <div class="nv-cell-label">META DO MÊS</div>
        <div class="nv-item-nome" style="margin-top:4px">${mascarar(formatCurrency(total), ocultar)} de ${mascarar(formatCurrency(meta.limite), ocultar)}</div>
      </div>
      <div class="nv-badge">${Math.round(statusMeta.percentual)}%</div>
    </div>`
        : ''
    }
    <div class="nv-section-head"><span class="nv-section-label">LANÇAMENTOS</span></div>
    <div>${listaItens}</div>
    ${tabBar('resumo', state.idioma)}
  `;
}

function renderMetas(state, ano, mes) {
  const ocultar = !!state.ocultarValores;
  const metas = state.metas || [];
  const gastos = L.gastosPorCategoria(state.lancamentos, ano, mes);
  const gastoPorCategoria = new Map(gastos.map((g) => [g.categoria, g.valor]));
  const totalGasto = gastos.reduce((s, g) => s + g.valor, 0);
  const totalLimite = metas.reduce((s, m) => s + m.limite, 0);
  const percentualGeral = totalLimite ? (totalGasto / totalLimite) * 100 : 0;
  const hoje = new Date();
  const ehMesAtual = hoje.getFullYear() === ano && hoje.getMonth() + 1 === mes;
  const diasNoMes = new Date(ano, mes, 0).getDate();
  const diasRestantes = ehMesAtual ? Math.max(0, diasNoMes - hoje.getDate()) : diasNoMes;

  const linhas = metas.length
    ? metas
        .map((m) => {
          const gasto = gastoPorCategoria.get(m.categoria) || 0;
          const status = L.statusMeta(gasto, m.limite);
          const pctBarra = Math.min(100, status.percentual);
          return `
        <div class="nv-meta-item ${status.excedeu ? 'excedida' : ''}" data-id="${m.id}" data-acao="editar-meta" role="button" tabindex="0">
          <div class="nv-meta-topo">
            <span>
              <span class="nv-meta-nome">${escapeHtml(m.nome || m.categoria)}</span>
              ${m.nome ? `<div class="nv-item-meta">${escapeHtml(m.categoria)}</div>` : ''}
            </span>
            <span class="nv-meta-valores ${status.excedeu ? 'excedida' : ''}">${mascarar(formatNumero(gasto), ocultar)} / ${mascarar(formatNumero(m.limite), ocultar)}</span>
          </div>
          <div class="nv-meta-track"><div class="nv-meta-fill ${status.excedeu ? 'excedida' : ''}" style="width:${pctBarra}%"></div></div>
          ${status.excedeu ? `<div class="nv-meta-excesso">Excedeu ${mascarar(formatCurrency(status.excedente), ocultar)}</div>` : ''}
        </div>`;
        })
        .join('')
    : '<p class="nv-vazio">Nenhuma meta definida ainda.</p>';

  return `
    ${headerTituloMes('Metas', ano, mes)}
    <div class="nv-orcamento">
      <div class="nv-cell-label">ORÇAMENTO USADO</div>
      <div class="nv-orcamento-num">
        <span class="grande">${Math.round(percentualGeral)}</span><span class="pct">%</span>
        <span class="detalhe">${mascarar(formatCurrency(totalGasto), ocultar)} de ${mascarar(formatCurrency(totalLimite), ocultar)}</span>
      </div>
      <div class="nv-orcamento-track"><div class="nv-orcamento-fill" style="width:${Math.min(100, percentualGeral)}%"></div></div>
      <div class="nv-orcamento-sub">Faltam ${diasRestantes} dias no mês</div>
    </div>
    <div>${linhas}</div>
    <div class="nv-acao-fixa" style="margin-top:auto">
      <button type="button" class="nv-btn-contorno" data-acao="nova-meta">
        <span>DEFINIR NOVA META</span><span class="mais">+</span>
      </button>
    </div>
    ${tabBar('metas', state.idioma)}
  `;
}

function renderPin(erro) {
  return `
    <div class="nv-abertura">
      ${iconSymbol(56, '#f3f2f2', 'var(--nv-accent)')}
      <div class="nv-wordmark" style="font-size:22px;margin-top:20px">NUVRA</div>
      <form id="formulario-pin" style="margin-top:auto;display:flex;flex-direction:column;gap:16px">
        <label style="display:flex;flex-direction:column;gap:8px;font-size:11px;font-weight:600;letter-spacing:.14em;color:rgba(243,242,242,.6)">
          DIGITE SEU PIN
          <input type="password" inputmode="numeric" pattern="[0-9]*" name="pin" maxlength="6" autofocus
            style="background:none;border:none;border-bottom:2px solid rgba(243,242,242,.35);color:#f3f2f2;font-size:36px;letter-spacing:.4em;text-align:center;padding:10px 0;outline:none;font-family:inherit" />
        </label>
        ${erro ? '<div style="color:var(--nv-negative);font-size:12px;font-weight:600;text-align:center">PIN incorreto</div>' : ''}
        <button type="submit" class="nv-abertura-cta">ENTRAR</button>
      </form>
    </div>`;
}

// --- Calendário financeiro ---

// Grade mensal no espírito do calendário de resultado dos apps de trading: cada dia mostra quanto
// entrou menos quanto saiu, pintado de positivo ou negativo, pra dar a leitura do mês num relance.
// Só dia com movimento é clicável — abrir um dia vazio não teria o que mostrar.
function renderCalendario(state, ano, mes, idioma) {
  const lancamentos = state.lancamentos || [];
  const ocultar = !!state.ocultarValores;
  const dias = L.resumoDiario(lancamentos, ano, mes);
  const primeiroDiaSemana = new Date(ano, mes - 1, 1).getDay();
  const diasNoMes = new Date(ano, mes, 0).getDate();
  const mesesAbrev = I18N.mesesDoIdioma ? MESES_ABREV : MESES_ABREV;

  const celulasVazias = Array.from({ length: primeiroDiaSemana }, () => '<div class="nv-dia nv-dia-vazio"></div>').join('');
  const celulas = Array.from({ length: diasNoMes }, (unused, i) => {
    const dia = i + 1;
    const chave = `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
    const resumo = dias[chave];
    if (!resumo) return `<div class="nv-dia"><span class="nv-dia-numero">${dia}</span></div>`;
    const classe = resumo.saldo > 0 ? 'nv-dia-positivo' : resumo.saldo < 0 ? 'nv-dia-negativo' : '';
    const sinal = resumo.saldo > 0 ? '+' : resumo.saldo < 0 ? '−' : '';
    return `
      <button type="button" class="nv-dia ${classe}" data-acao="abrir-dia" data-dia="${chave}">
        <span class="nv-dia-numero">${dia}</span>
        <span class="nv-dia-valor">${ocultar ? OCULTO : `${sinal}${formatNumero(Math.abs(resumo.saldo), idioma)}`}</span>
      </button>`;
  }).join('');

  const totalMes = Object.values(dias).reduce((s, d) => s + d.saldo, 0);
  return `
    <div class="nv-header">
      <span class="nv-title">Calendário</span>
      <span class="nv-month-label">${mesesAbrev[mes - 1]} ${ano}</span>
    </div>
    <div class="nv-calendario">
      <div class="nv-dias-semana">${['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d) => `<span>${d}</span>`).join('')}</div>
      <div class="nv-grade">${celulasVazias}${celulas}</div>
      <div class="nv-calendario-rodape">
        <span class="nv-label">RESULTADO DO MÊS</span>
        <span class="${totalMes >= 0 ? 'nv-positivo' : 'nv-negativo'}">
          ${ocultar ? OCULTO : `${totalMes >= 0 ? '+' : '−'} ${formatCurrency(Math.abs(totalMes), idioma)}`}
        </span>
      </div>
    </div>
    ${tabBar('calendario', idioma)}`;
}

function renderDiaDetalhe(state, data, idioma) {
  const ocultar = !!state.ocultarValores;
  const itens = L.lancamentosDoDia(state.lancamentos || [], data);
  const [ano, mes, dia] = String(data).split('-').map(Number);
  const entrada = itens.filter((i) => i.tipo === 'receita').reduce((s, i) => s + i.valor, 0);
  const saida = itens.filter((i) => i.tipo === 'despesa').reduce((s, i) => s + i.valor, 0);
  const saldo = entrada - saida;

  const lista = itens.length
    ? itens
        .map((i) => {
          const sinal = i.tipo === 'receita' ? '+' : i.tipo === 'despesa' ? '−' : '';
          const classe = i.tipo === 'receita' ? 'positivo' : i.tipo === 'despesa' ? 'negativo' : '';
          const parcela = i.parcelas > 1 ? ` <small>${i.numeroParcela}/${i.parcelas}</small>` : '';
          return `
            <div class="nv-item">
              <div>
                <div class="nv-item-nome">${escapeHtml(i.descricao)}${parcela}</div>
                <div class="nv-item-meta">${escapeHtml(i.categoria)}</div>
              </div>
              <span class="nv-item-valor ${classe}">${sinal} ${mascarar(formatCurrency(i.valor, idioma), ocultar)}</span>
            </div>`;
        })
        .join('')
    : '<p class="nv-vazio">Nenhum lançamento neste dia.</p>';

  return `
    ${headerVoltar(`${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')}/${ano}`, 'fechar-dia')}
    <div class="nv-hero" style="border-bottom:1px solid var(--nv-rule-soft)">
      <div class="nv-hero-label">SALDO DO DIA</div>
      <div class="nv-hero-value">
        <span class="cifrao" style="font-size:18px">R$</span>
        <span class="numero" style="font-size:44px">${mascarar(formatNumero(saldo, idioma), ocultar)}</span>
      </div>
      <div class="nv-item-meta" style="margin-top:10px">
        entrou ${mascarar(formatCurrency(entrada, idioma), ocultar)} · saiu ${mascarar(formatCurrency(saida, idioma), ocultar)}
      </div>
    </div>
    ${lista}`;
}

// --- Entrada rápida por texto ---

function renderEntradaRapida() {
  return `
    <form id="formulario-entrada-rapida" class="nv-entrada-rapida">
      <input type="text" id="campo-entrada-rapida" name="texto" autocomplete="off"
        placeholder="mercado 89,90" aria-label="Lançamento em texto livre" />
      <button type="submit" class="nv-entrada-rapida-ok" aria-label="Lançar">+</button>
    </form>
    <p class="nv-entrada-rapida-dica">Escreva do seu jeito: “uber 32”, “salário 4500”, “notebook 3600 em 12x”.</p>`;
}

// --- Teste de perfil de investidor ---

// Um radio por opção, com a primeira já marcada: assim o formulário nunca é enviado com pergunta
// em branco, e a resposta default é sempre a mais conservadora (pontos 0).
function renderPerguntasPerfil() {
  return L.perguntasPerfil().map(
    (p) => `
      <fieldset class="nv-perfil-bloco">
        <legend>${escapeHtml(p.pergunta)}</legend>
        ${p.opcoes
          .map(
            (o, i) => `
          <label class="nv-perfil-opcao">
            <input type="radio" name="${escapeHtml(p.id)}" value="${o.pontos}" ${i === 0 ? 'checked' : ''} />
            <span>${escapeHtml(o.texto)}</span>
          </label>`
          )
          .join('')}
      </fieldset>`
  ).join('');
}

const ROTULOS_TIPO_DIVIDA = {
  financiamento_imobiliario: 'Financiamento imobiliário',
  financiamento_veiculo: 'Financiamento de veículo',
  emprestimo: 'Empréstimo',
  consignado: 'Consignado',
  cartao: 'Cartão de crédito',
  outro: 'Outra dívida',
};

const ROTULO_PERFIL = {
  conservador: 'Conservador',
  moderado: 'Moderado',
  arrojado: 'Arrojado',
};

const RESUMO_PERFIL = {
  conservador: 'Você prioriza previsibilidade e não se sente confortável vendo o valor oscilar.',
  moderado: 'Você aceita alguma oscilação em troca de um retorno maior no médio prazo.',
  arrojado: 'Você tolera oscilação forte e pensa no longo prazo.',
};

// O aviso de que isto não é recomendação de investimento é obrigatório e coberto por teste:
// sugerir ativo a uma pessoa é atividade regulada pela CVM. Aqui só se distribui percentual por
// CLASSE de ativo, que é conteúdo educativo — nenhum papel específico é citado em lugar nenhum.
function renderResultadoPerfil(perfil, pontos, alocacao) {
  const linhas = Object.entries(alocacao || {})
    .sort((a, b) => b[1] - a[1])
    .map(
      ([tipo, pct]) => `
        <div class="nv-row-plain">
          <span>${escapeHtml(ROTULOS_TIPO_INVESTIMENTO[tipo] || tipo)}</span>
          <span><b>${pct}%</b></span>
        </div>`
    )
    .join('');
  return `
    <div class="nv-perfil-resultado">
      <div class="nv-label">SEU PERFIL</div>
      <div class="nv-perfil-nome">${escapeHtml(ROTULO_PERFIL[perfil] || perfil)}</div>
      <div class="nv-perfil-pontos">${pontos} de 12 pontos</div>
      <p class="nv-perfil-resumo">${escapeHtml(RESUMO_PERFIL[perfil] || '')}</p>
      <div class="nv-label" style="margin-top:22px">SUGESTÃO DE ALOCAÇÃO POR CLASSE</div>
      ${linhas}
      <p class="nv-perfil-aviso">
        Isto é material educativo e não é recomendação de investimento. A sugestão distribui
        percentuais por classe de ativo e não indica nenhum ativo específico. Decisões de
        investimento são suas; se precisar de orientação, procure um profissional habilitado.
      </p>
    </div>`;
}

// --- Tela de calculadoras ---
// Ferramentas de apoio, sem ligação com os dados do usuário (não lê nem grava lançamento,
// investimento etc.) — por isso não recebe `state`. O cálculo em si roda no clique do botão
// (em app.js), lendo os campos direto do DOM; esta função só desenha o formulário e a área de
// resultado (vazia/oculta até o primeiro clique).

function corpoJurosCompostos() {
  return `
    <div class="nv-section-head"><span class="nv-section-label">JUROS COMPOSTOS</span></div>
    <div class="nv-campo-linha">
      <label class="nv-campo-label" for="campo-calc-compostos-capital">CAPITAL INICIAL (R$)</label>
      <input type="text" inputmode="decimal" id="campo-calc-compostos-capital" class="nv-campo-moeda" placeholder="0,00" />
    </div>
    <div class="nv-campo-linha">
      <label class="nv-campo-label" for="campo-calc-compostos-aporte">APORTE MENSAL (R$)</label>
      <input type="text" inputmode="decimal" id="campo-calc-compostos-aporte" class="nv-campo-moeda" placeholder="0,00" />
    </div>
    <div class="nv-campo-dupla">
      <div>
        <label class="nv-campo-label" for="campo-calc-compostos-taxa">TAXA MENSAL (%)</label>
        <input type="text" inputmode="decimal" id="campo-calc-compostos-taxa" placeholder="1,00" />
      </div>
      <div>
        <label class="nv-campo-label" for="campo-calc-compostos-meses">PERÍODO (MESES)</label>
        <input type="number" min="0" id="campo-calc-compostos-meses" placeholder="12" />
      </div>
    </div>
    <div class="nv-acao-fixa">
      <button type="button" class="nv-btn-contorno" data-acao="calcular-compostos"><span>CALCULAR</span></button>
    </div>
    <div id="resultado-calc-compostos" class="nv-list-plain" hidden></div>`;
}

function corpoJurosSimples() {
  return `
    <div class="nv-section-head"><span class="nv-section-label">JUROS SIMPLES</span></div>
    <div class="nv-campo-linha">
      <label class="nv-campo-label" for="campo-calc-simples-capital">CAPITAL INICIAL (R$)</label>
      <input type="text" inputmode="decimal" id="campo-calc-simples-capital" class="nv-campo-moeda" placeholder="0,00" />
    </div>
    <div class="nv-campo-dupla">
      <div>
        <label class="nv-campo-label" for="campo-calc-simples-taxa">TAXA MENSAL (%)</label>
        <input type="text" inputmode="decimal" id="campo-calc-simples-taxa" placeholder="1,00" />
      </div>
      <div>
        <label class="nv-campo-label" for="campo-calc-simples-meses">PERÍODO (MESES)</label>
        <input type="number" min="0" id="campo-calc-simples-meses" placeholder="12" />
      </div>
    </div>
    <div class="nv-acao-fixa">
      <button type="button" class="nv-btn-contorno" data-acao="calcular-simples"><span>CALCULAR</span></button>
    </div>
    <div id="resultado-calc-simples" class="nv-list-plain" hidden></div>`;
}

function corpoPorcentagem() {
  return `
    <div class="nv-section-head"><span class="nv-section-label">QUANTO É X% DE UM VALOR</span></div>
    <div class="nv-campo-dupla">
      <div>
        <label class="nv-campo-label" for="campo-calc-pct1-percentual">PERCENTUAL (%)</label>
        <input type="text" inputmode="decimal" id="campo-calc-pct1-percentual" placeholder="15" />
      </div>
      <div>
        <label class="nv-campo-label" for="campo-calc-pct1-valor">VALOR (R$)</label>
        <input type="text" inputmode="decimal" id="campo-calc-pct1-valor" class="nv-campo-moeda" placeholder="0,00" />
      </div>
    </div>
    <div class="nv-acao-fixa">
      <button type="button" class="nv-btn-contorno" data-acao="calcular-pct1"><span>CALCULAR</span></button>
    </div>
    <div id="resultado-calc-pct1" class="nv-list-plain" hidden></div>

    <div class="nv-section-head" style="border-top:1px solid var(--nv-rule-soft)"><span class="nv-section-label">QUE PERCENTUAL UM VALOR REPRESENTA DE UM TOTAL</span></div>
    <div class="nv-campo-dupla">
      <div>
        <label class="nv-campo-label" for="campo-calc-pct2-valor">VALOR (R$)</label>
        <input type="text" inputmode="decimal" id="campo-calc-pct2-valor" class="nv-campo-moeda" placeholder="0,00" />
      </div>
      <div>
        <label class="nv-campo-label" for="campo-calc-pct2-total">TOTAL (R$)</label>
        <input type="text" inputmode="decimal" id="campo-calc-pct2-total" class="nv-campo-moeda" placeholder="0,00" />
      </div>
    </div>
    <div class="nv-acao-fixa">
      <button type="button" class="nv-btn-contorno" data-acao="calcular-pct2"><span>CALCULAR</span></button>
    </div>
    <div id="resultado-calc-pct2" class="nv-list-plain" hidden></div>

    <div class="nv-section-head" style="border-top:1px solid var(--nv-rule-soft)"><span class="nv-section-label">AUMENTAR OU DIMINUIR UM VALOR EM X%</span></div>
    <div class="nv-campo-dupla">
      <div>
        <label class="nv-campo-label" for="campo-calc-pct3-valor">VALOR (R$)</label>
        <input type="text" inputmode="decimal" id="campo-calc-pct3-valor" class="nv-campo-moeda" placeholder="0,00" />
      </div>
      <div>
        <label class="nv-campo-label" for="campo-calc-pct3-percentual">PERCENTUAL (use negativo p/ diminuir)</label>
        <input type="text" inputmode="decimal" id="campo-calc-pct3-percentual" placeholder="10 ou -10" />
      </div>
    </div>
    <div class="nv-acao-fixa">
      <button type="button" class="nv-btn-contorno" data-acao="calcular-pct3"><span>CALCULAR</span></button>
    </div>
    <div id="resultado-calc-pct3" class="nv-list-plain" hidden></div>`;
}

function corpoPrimeiroMilhao(modoMilhao) {
  const modo = modoMilhao === 'aporte' ? 'aporte' : 'tempo';
  return `
    <div class="nv-section-head"><span class="nv-section-label">PRIMEIRO MILHÃO</span></div>
    <div class="nv-segmentado">
      <button type="button" data-acao="definir-modo-milhao" data-modomilhao="tempo" class="${modo === 'tempo' ? 'ativo' : ''}">TEMPO NECESSÁRIO</button>
      <button type="button" data-acao="definir-modo-milhao" data-modomilhao="aporte" class="${modo === 'aporte' ? 'ativo' : ''}">APORTE NECESSÁRIO</button>
    </div>
    <div class="nv-campo-linha">
      <label class="nv-campo-label" for="campo-calc-milhao-alvo">VALOR-ALVO (R$)</label>
      <input type="text" inputmode="decimal" id="campo-calc-milhao-alvo" class="nv-campo-moeda" value="${formatNumero(1000000)}" />
    </div>
    <div class="nv-campo-dupla">
      <div>
        <label class="nv-campo-label" for="campo-calc-milhao-capital">CAPITAL INICIAL (R$)</label>
        <input type="text" inputmode="decimal" id="campo-calc-milhao-capital" class="nv-campo-moeda" placeholder="0,00" />
      </div>
      <div>
        <label class="nv-campo-label" for="campo-calc-milhao-taxa">TAXA MENSAL (%)</label>
        <input type="text" inputmode="decimal" id="campo-calc-milhao-taxa" placeholder="1,00" />
      </div>
    </div>
    ${
      modo === 'tempo'
        ? `<div class="nv-campo-linha">
      <label class="nv-campo-label" for="campo-calc-milhao-aporte">APORTE MENSAL (R$)</label>
      <input type="text" inputmode="decimal" id="campo-calc-milhao-aporte" class="nv-campo-moeda" placeholder="0,00" />
    </div>`
        : `<div class="nv-campo-linha">
      <label class="nv-campo-label" for="campo-calc-milhao-meses">PRAZO DESEJADO (MESES)</label>
      <input type="number" min="1" id="campo-calc-milhao-meses" placeholder="120" />
    </div>`
    }
    <div class="nv-acao-fixa">
      <button type="button" class="nv-btn-contorno" data-acao="calcular-milhao"><span>CALCULAR</span></button>
    </div>
    <div id="resultado-calc-milhao" class="nv-list-plain" hidden></div>`;
}

function renderCalculadoras(modo = 'compostos', modoMilhao = 'tempo') {
  const abas = [
    { id: 'compostos', rotulo: 'COMPOSTOS' },
    { id: 'simples', rotulo: 'SIMPLES' },
    { id: 'porcentagem', rotulo: '%' },
    { id: 'milhao', rotulo: '1º MILHÃO' },
  ];
  const corpos = {
    compostos: corpoJurosCompostos,
    simples: corpoJurosSimples,
    porcentagem: corpoPorcentagem,
    milhao: () => corpoPrimeiroMilhao(modoMilhao),
  };
  const corpo = (corpos[modo] || corpos.compostos)();
  return `
    ${headerVoltar('Calculadoras', 'fechar-calculadoras')}
    <div class="nv-segmentado">
      ${abas
        .map(
          (a) => `<button type="button" data-acao="definir-calculadora" data-calc="${a.id}" class="${a.id === modo ? 'ativo' : ''}">${a.rotulo}</button>`
        )
        .join('')}
    </div>
    <div id="corpo-calculadora">${corpo}</div>`;
}

// Nome de cada idioma escrito nele mesmo (não traduzido) — é assim que seletor de idioma
// normalmente funciona (a pessoa reconhece o nome do próprio idioma mesmo sem saber ler os outros).
const NOME_PROPRIO_IDIOMA = { pt: 'PORTUGUÊS', en: 'ENGLISH', es: 'ESPAÑOL' };

const CHAVE_I18N_TIPO_CONTA = { cartao: 'conta.tipoCartao', conta: 'conta.tipoContaCorrente', carteira: 'conta.tipoCarteira' };

function rotuloTipoConta(tipo, idioma) {
  const chave = CHAVE_I18N_TIPO_CONTA[tipo];
  return chave ? I18N.t(chave, idioma) : tipo;
}

function renderConfiguracoes(state, temPin) {
  const idioma = state.idioma;
  const contas = state.contas || [];
  const tema = state.tema || 'escuro';
  const ocultar = !!state.ocultarValores;

  const linhasContas = contas
    .map(
      (c) => `
    <div class="nv-conta-linha" data-id="${c.id}">
      <span style="display:flex;align-items:center;gap:12px">
        <span class="nv-conta-marcador">${escapeHtml((c.nome || '?').slice(0, 1).toUpperCase())}</span>
        <span class="nv-item-nome">${escapeHtml(c.nome)}</span>
      </span>
      <span style="display:flex;align-items:center;gap:10px">
        <span class="nv-item-meta">${escapeHtml(rotuloTipoConta(c.tipo, idioma))}${c.fechamento ? ` · ${I18N.t('config.fechaDia', idioma)} ${c.fechamento}` : ''}</span>
        <button type="button" class="nv-link-muted" data-acao="excluir-conta" data-id="${c.id}" aria-label="Remover conta">✕</button>
      </span>
    </div>`
    )
    .join('');

  return `
    ${headerVoltar(I18N.t('config.titulo', idioma), 'fechar-configuracoes')}
    <div class="nv-perfil">
      <div class="nv-avatar">${iconSymbol(24, 'var(--nv-fg-inverse)', 'var(--nv-accent)')}</div>
      <div>
        <div class="nv-perfil-nome">${I18N.t('config.minhaConta', idioma)}</div>
        <div class="nv-perfil-sub">${I18N.t('config.dadosSincronizados', idioma)}</div>
      </div>
    </div>
    <div class="nv-section-head" style="padding-bottom:0"><span class="nv-section-label">${I18N.t('config.aparencia', idioma)}</span></div>
    <div style="padding:8px 20px 16px">
      <div class="nv-segmentado-tema">
        <button type="button" data-acao="definir-tema" data-tema="claro" class="${tema === 'claro' ? 'ativo' : ''}">${iconSol(16)}<span>${I18N.t('config.claro', idioma)}</span></button>
        <button type="button" data-acao="definir-tema" data-tema="escuro" class="${tema === 'escuro' ? 'ativo' : ''}">${iconLua(16)}<span>${I18N.t('config.escuro', idioma)}</span></button>
        <button type="button" data-acao="definir-tema" data-tema="sistema" class="${tema === 'sistema' ? 'ativo' : ''}">${iconMonitor(16)}<span>${I18N.t('config.sistema', idioma)}</span></button>
      </div>
    </div>
    <div class="nv-section-head" style="padding-top:8px;padding-bottom:0;border-top:1px solid var(--nv-rule-soft)"><span class="nv-section-label">${I18N.t('config.idioma', idioma)}</span></div>
    <div style="padding:8px 20px 16px">
      <div class="nv-segmentado-tema">
        ${I18N.listaIdiomas()
          .map(
            (cod) =>
              `<button type="button" data-acao="definir-idioma" data-idioma="${cod}" class="${(idioma || 'pt') === cod ? 'ativo' : ''}"><span>${NOME_PROPRIO_IDIOMA[cod]}</span></button>`
          )
          .join('')}
      </div>
    </div>
    <div class="nv-section-head" style="padding-top:8px;padding-bottom:8px;border-top:1px solid var(--nv-rule-soft)"><span class="nv-section-label">${I18N.t('config.contasCartoes', idioma)}</span></div>
    <div>${linhasContas}</div>
    <div class="nv-conta-linha" style="border-bottom:2px solid var(--nv-rule-strong)">
      <button type="button" class="nv-link-accent" data-acao="nova-conta" style="font-size:12px">${I18N.t('config.adicionarConta', idioma)}</button>
      <span class="mais" style="color:var(--nv-accent)">+</span>
    </div>
    <div class="nv-section-head" style="padding-bottom:8px"><span class="nv-section-label">${I18N.t('config.dados', idioma)}</span></div>
    <div class="nv-dado-linha"><span>${I18N.t('config.sincronizacao', idioma)}</span><span class="nv-item-meta" id="status-sincronizacao">verificando…</span></div>
    <div class="nv-dado-linha">
      <span>${I18N.t('config.ocultarValores', idioma)}</span>
      <label class="nv-switch-wrap">
        <input type="checkbox" id="campo-ocultar-valores" ${ocultar ? 'checked' : ''} />
        <span class="nv-switch"><span class="knob"></span></span>
      </label>
    </div>
    <div class="nv-dado-linha">
      <span>${I18N.t('config.importarPlanilha', idioma)}</span>
      <button type="button" class="nv-link-accent" data-acao="abrir-importacao" style="font-size:11px">${I18N.t('config.importar', idioma)}</button>
    </div>
    <div class="nv-section-head" style="padding-top:8px;padding-bottom:8px;border-top:1px solid var(--nv-rule-soft)"><span class="nv-section-label">${I18N.t('config.seguranca', idioma)}</span></div>
    <div class="nv-dado-linha">
      <span>${I18N.t('config.pinAcesso', idioma)}</span>
      <span style="display:flex;gap:14px;align-items:center">
        <span class="nv-item-meta">${temPin ? I18N.t('config.ativado', idioma) : I18N.t('config.desativado', idioma)}</span>
        <button type="button" class="nv-link-accent" data-acao="definir-pin" style="font-size:11px">${temPin ? I18N.t('config.alterar', idioma) : I18N.t('config.definir', idioma)}</button>
        ${temPin ? `<button type="button" class="nv-link-muted" data-acao="remover-pin" style="font-size:11px;color:var(--nv-negative)">${I18N.t('config.remover', idioma)}</button>` : ''}
      </span>
    </div>
    <div class="nv-rodape-versao">NUVRA 1.0.0</div>
  `;
}

// Tela de importação de CSV — 3 passos guardados no mesmo objeto `imp` (ver app.js):
// sem `colunas` -> escolher arquivo; com `colunas` -> mapear; com `resultado` -> resumo.
// Fica em português (fase de i18n ainda não cobre telas fora de Resumo/Config).
function renderImportarPlanilha(state, imp) {
  const contas = state.contas || [];
  const voltar = headerVoltar('Importar planilha', 'fechar-importar');

  if (imp && imp.resultado) {
    const { total, ignoradas } = imp.resultado;
    const listaIgnoradas = ignoradas.length
      ? `<div class="nv-section-head"><span class="nv-section-label">LINHAS IGNORADAS</span></div>
         ${ignoradas
           .map(
             (ig) =>
               `<div class="nv-dado-linha"><span>Linha ${ig.linha}</span><span class="nv-item-meta">${escapeHtml(ig.motivo)}</span></div>`
           )
           .join('')}`
      : '';
    return `
      ${voltar}
      <div class="nv-hero" style="border-bottom:1px solid var(--nv-rule-soft)">
        <div class="nv-hero-label">IMPORTADOS</div>
        <div class="nv-hero-value"><span class="numero" style="font-size:44px">${total}</span></div>
        <div class="nv-item-meta" style="margin-top:10px">
          ${total} lançamento${total === 1 ? '' : 's'} adicionado${total === 1 ? '' : 's'}${
            ignoradas.length ? ` · ${ignoradas.length} ignorada${ignoradas.length === 1 ? '' : 's'}` : ''
          }
        </div>
      </div>
      ${listaIgnoradas}
      <p class="nv-vazio" style="text-align:left;padding:16px 20px">
        Confira em Lançamentos. Importar o mesmo arquivo de novo cria lançamentos duplicados — não há verificação de repetidos.
      </p>
      <div style="padding:8px 20px 24px">
        <button type="button" class="nv-btn-contorno" data-acao="fechar-importar"><span>CONCLUIR</span></button>
      </div>`;
  }

  if (imp && imp.colunas && imp.colunas.length) {
    const opcoesColuna = (selecionado) =>
      '<option value="">— não importar —</option>' +
      imp.colunas
        .map(
          (c, i) =>
            `<option value="${i}" ${String(selecionado) === String(i) ? 'selected' : ''}>${escapeHtml(c || `Coluna ${i + 1}`)}</option>`
        )
        .join('');
    const campo = (id, rotulo, sugerido, obrigatorio) => `
      <div class="nv-campo-linha">
        <span class="nv-campo-label">${rotulo}${obrigatorio ? ' *' : ''}</span>
        <select id="${id}">${opcoesColuna(sugerido)}</select>
      </div>`;

    const tabela = `
      <div style="overflow-x:auto;padding:0 20px 12px">
        <table style="border-collapse:collapse;font-size:11px;width:100%">
          <thead><tr>${imp.colunas
            .map(
              (c) =>
                `<th style="text-align:left;padding:6px 12px 6px 0;border-bottom:1px solid var(--nv-rule-soft);white-space:nowrap">${escapeHtml(c)}</th>`
            )
            .join('')}</tr></thead>
          <tbody>${imp.linhas
            .slice(0, 6)
            .map(
              (l) =>
                `<tr>${imp.colunas
                  .map(
                    (unused, i) =>
                      `<td style="padding:6px 12px 6px 0;border-bottom:1px solid var(--nv-hairline);white-space:nowrap">${escapeHtml(l[i] || '')}</td>`
                  )
                  .join('')}</tr>`
            )
            .join('')}</tbody>
        </table>
      </div>`;

    const seletorContaPadrao = contas.length
      ? `<div class="nv-campo-linha">
           <span class="nv-campo-label">LANÇAR NA CONTA</span>
           <select id="import-conta-padrao">
             <option value="">— nenhuma —</option>
             ${contas.map((c) => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.nome)}</option>`).join('')}
           </select>
         </div>`
      : '';

    return `
      ${voltar}
      <div class="nv-section-head"><span class="nv-section-label">${imp.linhas.length} LINHA${
        imp.linhas.length === 1 ? '' : 'S'
      } ENCONTRADA${imp.linhas.length === 1 ? '' : 'S'}</span></div>
      ${tabela}
      <div class="nv-section-head"><span class="nv-section-label">DE QUAL COLUNA VEM CADA CAMPO</span></div>
      ${campo('map-data', 'DATA', imp.sugestao.data, true)}
      ${campo('map-valor', 'VALOR', imp.sugestao.valor, true)}
      ${campo('map-descricao', 'DESCRIÇÃO', imp.sugestao.descricao, false)}
      ${campo('map-categoria', 'CATEGORIA', imp.sugestao.categoria, false)}
      ${campo('map-parcelas', 'PARCELAS', imp.sugestao.parcelas, false)}
      ${contas.length ? campo('map-conta', 'CONTA', imp.sugestao.conta, false) : ''}
      ${seletorContaPadrao}
      <p class="nv-vazio" style="text-align:left;padding:12px 20px">
        Valor negativo vira despesa; positivo, receita. Sem coluna de categoria, o Nuvra adivinha pela descrição. Uma coluna de conta na planilha, quando o nome bate com uma das suas contas, tem prioridade sobre a conta escolhida acima.
      </p>
      <div style="padding:8px 20px 24px">
        <button type="button" class="nv-btn-contorno" data-acao="confirmar-importacao"><span>IMPORTAR LANÇAMENTOS</span></button>
      </div>`;
  }

  return `
    ${voltar}
    <div style="padding:20px">
      <p style="font-size:13px;color:var(--nv-muted);line-height:1.5;margin:0 0 16px">
        Exporte sua planilha como CSV (no Excel: <strong>Salvar como → CSV</strong>) e escolha o arquivo abaixo. Cada linha com data e valor vira um lançamento. Nada sai do aparelho — o arquivo é lido aqui mesmo.
      </p>
      <input type="file" id="campo-arquivo-csv" accept=".csv,text/csv,text/plain" style="font-size:13px;width:100%;margin-bottom:20px" />
      <p style="font-size:11px;font-weight:600;letter-spacing:.12em;color:var(--nv-muted);margin:0 0 8px">OU COLE O CONTEÚDO</p>
      <textarea id="campo-texto-csv" rows="6" placeholder="data,descrição,valor&#10;01/08/2026,Mercado,-89,90" style="width:100%;font-family:inherit;font-size:13px;padding:10px;border:1px solid var(--nv-rule-soft);border-radius:8px;background:var(--nv-bg);color:var(--nv-fg);resize:vertical;box-sizing:border-box"></textarea>
      <div style="margin-top:16px">
        <button type="button" class="nv-btn-contorno" data-acao="analisar-csv"><span>CONTINUAR</span></button>
      </div>
    </div>`;
}

function renderAbertura() {
  return `
    <div class="nv-abertura">
      ${iconSymbol(80, '#f3f2f2', 'var(--nv-accent)')}
      <div class="nv-wordmark" style="font-size:32px;margin-top:28px">NUVRA</div>
      <p class="nv-abertura-frase">Um número por mês. O resto é registro.</p>
      <div style="margin-top:auto">
        <div class="nv-abertura-progress"><span class="ativo"></span><span></span><span></span></div>
        <button type="button" class="nv-abertura-cta" data-acao="comecar">COMEÇAR</button>
      </div>
    </div>`;
}

// Gráfico de rosca (donut) da composição da carteira por tipo de ativo — mesma paleta
// monocromática + acento já usada na barra de composição, pra manter a identidade do app (o
// resto da UI não usa nenhuma outra cor além dessas).
function renderGraficoComposicao(composicao, total, cores) {
  const raio = 52;
  const espessura = 20;
  const circunferencia = 2 * Math.PI * raio;
  let acumulado = 0;
  const segmentos = composicao
    .map((c, i) => {
      const fracao = total ? c.valor / total : 0;
      const comprimento = fracao * circunferencia;
      const dashoffset = -acumulado;
      acumulado += comprimento;
      return `<circle cx="60" cy="60" r="${raio}" fill="none" stroke="${cores[i % cores.length]}" stroke-width="${espessura}" stroke-dasharray="${comprimento.toFixed(2)} ${(circunferencia - comprimento).toFixed(2)}" stroke-dashoffset="${dashoffset.toFixed(2)}"></circle>`;
    })
    .join('');
  return `
    <svg width="120" height="120" viewBox="0 0 120 120" style="transform:rotate(-90deg);flex:none" role="img" aria-label="Gráfico de composição da carteira por tipo de ativo">
      <circle cx="60" cy="60" r="${raio}" fill="none" stroke="var(--nv-hairline)" stroke-width="${espessura}"></circle>
      ${segmentos}
    </svg>`;
}

function renderInvestimentos(state) {
  const ocultar = !!state.ocultarValores;
  const investimentos = state.investimentos || [];
  const carteira = L.totalCarteira(investimentos);

  const cores = ['var(--nv-accent)', 'var(--nv-bar-neutral-strong)', 'var(--nv-bar-neutral)', 'var(--nv-muted)', 'var(--nv-muted-2)', 'var(--nv-track)'];
  const resumos = investimentos.map((i) => ({ investimento: i, resumo: L.resumoInvestimento(i) }));
  const composicaoBruta = L.composicaoPorTipo(investimentos);
  // Mais de 6 tipos distintos vira ilegível numa pizza — os menores (já vêm ordenados do maior
  // pro menor) dobram em "Outros" em vez de gerar mais uma cor.
  const composicao =
    composicaoBruta.length > 6
      ? [...composicaoBruta.slice(0, 5), { tipo: 'outros_agrupados', valor: composicaoBruta.slice(5).reduce((s, c) => s + c.valor, 0) }]
      : composicaoBruta;
  const totalComposicao = composicao.reduce((s, c) => s + c.valor, 0) || 1;
  const sugestao = L.sugestaoAporte(investimentos, state.alocacaoAlvo).filter((s) => s.diferenca > 0);
  const hoje = new Date();
  const imposto = L.impostoEstimadoMes(investimentos, hoje.getFullYear(), hoje.getMonth() + 1);
  const agendaDividendos = L.proximosDividendosPrevistos(investimentos);

  const itens = resumos.length
    ? resumos
        .map(({ investimento: i, resumo: r }) => {
          const classe = r.rendimentoValor > 0 ? 'positivo' : r.rendimentoValor < 0 ? 'negativo' : '';
          const rotuloTipo = ROTULOS_TIPO_INVESTIMENTO[i.tipo] || i.tipo;
          return `
        <div class="nv-ativo-linha" data-id="${i.id}" data-acao="abrir-ativo">
          <div style="display:flex;align-items:center;gap:12px">
            ${monogramaAtivo(i.nome, 34)}
            <div>
              <div class="nv-item-nome">${escapeHtml(i.nome)}</div>
              <div class="nv-item-meta">${escapeHtml(rotuloTipo)} · investido ${mascarar(formatCurrency(r.valorInvestido), ocultar)}</div>
            </div>
          </div>
          <div class="nv-ativo-valor">
            <div class="nv-item-valor">${mascarar(formatCurrency(r.valorAtual), ocultar)}</div>
            <div class="nv-ativo-rend ${classe}">${formatPercent(r.rendimentoPercentual)}</div>
          </div>
        </div>`;
        })
        .join('')
    : '<p class="nv-vazio">Nenhum investimento cadastrado.</p>';

  return `
    <div class="nv-header">
      <span class="nv-title">Carteira</span>
      <span class="nv-month-label">${investimentos.length} ATIVO${investimentos.length === 1 ? '' : 'S'}</span>
    </div>
    <div class="nv-hero" style="border-bottom:1px solid var(--nv-rule-soft)">
      <div class="nv-hero-label">VALOR ATUAL</div>
      <div class="nv-hero-value">
        <span class="cifrao" style="font-size:18px">R$</span>
        <span class="numero" style="font-size:48px">${mascarar(formatNumero(carteira.totalAtual), ocultar)}</span>
      </div>
      <div class="nv-carteira-badge-row">
        <span class="nv-carteira-badge">${formatPercent(carteira.rendimentoPercentual)}</span>
        <span class="nv-item-meta">${carteira.rendimentoValor >= 0 ? '+' : '−'} ${mascarar(formatCurrency(Math.abs(carteira.rendimentoValor)), ocultar)} sobre ${mascarar(formatCurrency(carteira.totalInvestido), ocultar)}</span>
      </div>
    </div>
    ${
      investimentos.length
        ? '<button type="button" class="nv-link-accent" data-acao="abrir-perfil" style="margin:14px 0 0 20px;font-size:10px">DESCOBRIR MEU PERFIL</button>'
        : `<div class="nv-perfil-convite">
            <div class="nv-perfil-convite-titulo">Não sabe por onde começar?</div>
            <p>Responda 4 perguntas e descubra seu perfil de investidor. O app sugere uma divisão por classe de ativo pra você usar como meta.</p>
            <button type="button" class="nv-perfil-cta" data-acao="abrir-perfil">FAZER O TESTE</button>
          </div>`
    }
    ${
      composicao.length
        ? `<div class="nv-composicao">
      <div class="nv-section-label" style="margin-bottom:10px">COMPOSIÇÃO</div>
      <div class="nv-composicao-grafico">
        ${renderGraficoComposicao(composicao, totalComposicao, cores)}
        <div class="nv-composicao-legenda">
          ${composicao
            .map(
              (c, i) =>
                `<div class="nv-composicao-item"><span class="nv-composicao-bolinha" style="background:${cores[i % cores.length]}"></span>${escapeHtml(rotuloTipoInvestimento(c.tipo)).toUpperCase()} <b>${Math.round((c.valor / totalComposicao) * 100)}%</b></div>`
            )
            .join('')}
        </div>
      </div>
      <button type="button" class="nv-link-accent" data-acao="editar-alocacao" style="margin-top:10px;font-size:10px">METAS DE ALOCAÇÃO</button>
    </div>`
        : ''
    }
    ${
      sugestao.length
        ? `<div class="nv-section-head"><span class="nv-section-label">PRÓXIMO APORTE</span></div>
    <div class="nv-list-plain">
      ${sugestao
        .map(
          (s) => `<div class="nv-row-plain"><span>${escapeHtml(ROTULOS_TIPO_INVESTIMENTO[s.tipo] || s.tipo)}</span><span>faltam ${mascarar(formatCurrency(s.diferenca), ocultar)}</span></div>`
        )
        .join('')}
    </div>`
        : ''
    }
    ${
      agendaDividendos.length
        ? `<div class="nv-section-head"><span class="nv-section-label">PRÓXIMOS DIVIDENDOS</span></div>
    <div class="nv-list-plain">
      ${agendaDividendos
        .map((p) => {
          const dataFmt = p.data.split('-').reverse().slice(0, 2).join('/');
          return `<div class="nv-row-plain"><span>${escapeHtml(p.nome)} · ${dataFmt}</span><span>${mascarar(formatCurrency(p.valor), ocultar)}</span></div>`;
        })
        .join('')}
    </div>`
        : ''
    }
    <div>${itens}</div>
    <div class="nv-acao-fixa" style="margin-top:auto">
      <button type="button" class="nv-btn-contorno" data-acao="novo-investimento">
        <span>NOVO ATIVO</span><span class="mais">+</span>
      </button>
    </div>
    ${
      imposto.length
        ? `<div class="nv-section-head"><span class="nv-section-label">IMPOSTO ESTIMADO — ${MESES[hoje.getMonth()].toUpperCase()}</span></div>
    <div class="nv-list-plain">
      ${imposto
        .map(
          (i) => `<div class="nv-row-plain"><span>${escapeHtml(ROTULOS_TIPO_INVESTIMENTO[i.tipo] || i.tipo)}${i.isento ? ' (isento)' : ` · ${Math.round(i.aliquota * 100)}%`}</span><span>${mascarar(formatCurrency(i.impostoEstimado), ocultar)}</span></div>`
        )
        .join('')}
    </div>
    <p class="nv-item-meta" style="padding:0 20px 16px">Estimativa de apoio à decisão — não substitui o cálculo de um contador pra fins de DARF.</p>`
        : ''
    }
    ${blocoDividas(state, investimentos, ocultar)}
    <button type="button" class="nv-novo" data-acao="nova-divida">
      <span>NOVA DÍVIDA</span><span class="nv-novo-mais">+</span>
    </button>
    ${tabBar('carteira', state.idioma)}
  `;
}

// A carteira sozinha conta metade da história: quem tem 20 mil investidos e 180 mil de
// financiamento não tem 20 mil. Só aparece pra quem registrou dívida — sem dívida, patrimônio
// líquido é igual à carteira e o card seria ruído repetindo o número que já está no topo.
function blocoDividas(state, investimentos, ocultar) {
  const dividas = state.dividas || [];
  if (!dividas.length) return '';
  const pl = L.patrimonioLiquido(investimentos, dividas);
  const linhas = dividas
    .map(
      (d) => `
      <div class="nv-item" data-id="${d.id}" data-acao="editar-divida">
        <div>
          <div class="nv-item-nome">${escapeHtml(d.nome)}</div>
          <div class="nv-item-meta">${escapeHtml(ROTULOS_TIPO_DIVIDA[d.tipo] || d.tipo)}${
            d.parcelasRestantes ? ` · faltam ${d.parcelasRestantes}x` : ''
          }</div>
        </div>
        <span class="nv-item-valor negativo">${mascarar(formatCurrency(d.saldoDevedor || 0), ocultar)}</span>
      </div>`
    )
    .join('');
  return `
    <div class="nv-patrimonio">
      <div class="nv-label">PATRIMÔNIO LÍQUIDO</div>
      <div class="nv-patrimonio-valor ${pl.negativo ? 'nv-negativo' : ''}">${mascarar(formatCurrency(pl.liquido), ocultar)}</div>
      <div class="nv-item-meta">${mascarar(formatCurrency(pl.ativos), ocultar)} em ativos − ${mascarar(formatCurrency(pl.dividas), ocultar)} em dívidas</div>
    </div>
    <div class="nv-section-head" style="margin-top:18px">
      <span class="nv-section-label">DÍVIDAS</span>
    </div>
    ${linhas}`;
}

function renderAtivoDetalhe(state, ativoId) {
  const ocultar = !!state.ocultarValores;
  const investimento = (state.investimentos || []).find((i) => i.id === ativoId);
  if (!investimento) return '<p class="nv-vazio">Ativo não encontrado.</p>';

  const resumo = L.resumoInvestimento(investimento);
  const operacoes = investimento.operacoes || [];
  const proventos = investimento.proventos || [];
  const totalProventos = L.totalProventos(proventos);
  const classeRend = resumo.rendimentoValor > 0 ? 'positivo' : resumo.rendimentoValor < 0 ? 'negativo' : '';
  const dividendosPrevistos = L.proximosDividendosPrevistos([investimento]);

  const listaProventos = proventos.length
    ? [...proventos]
        .sort((a, b) => b.data.localeCompare(a.data))
        .map((p) => {
          const dataFmt = p.data.split('-').reverse().slice(0, 2).join('/');
          return `
        <div class="nv-conta-linha" data-id="${p.id}">
          <div>
            <div class="nv-item-nome">${p.tipo === 'jcp' ? 'JCP' : 'DIVIDENDO'} · ${dataFmt}</div>
          </div>
          <div style="display:flex;align-items:center;gap:10px">
            <div class="nv-item-valor">${mascarar(formatCurrency(p.valor), ocultar)}</div>
            <button type="button" class="nv-link-muted" data-acao="excluir-provento" data-id="${p.id}" aria-label="Excluir provento" style="color:var(--nv-negative)">✕</button>
          </div>
        </div>`;
        })
        .join('')
    : '<p class="nv-vazio">Nenhum provento recebido ainda.</p>';

  const listaOperacoes = operacoes.length
    ? [...operacoes]
        .sort((a, b) => b.data.localeCompare(a.data))
        .map((op) => {
          const dataFmt = op.data.split('-').reverse().slice(0, 2).join('/');
          const valorOperacao = op.quantidade * op.precoUnitario;
          return `
        <div class="nv-conta-linha" data-id="${op.id}">
          <div>
            <div class="nv-item-nome">${op.tipo === 'compra' ? 'COMPRA' : 'VENDA'} · ${dataFmt}</div>
            <div class="nv-item-meta">${formatNumero(op.quantidade)} × ${mascarar(formatCurrency(op.precoUnitario), ocultar)}</div>
          </div>
          <div style="display:flex;align-items:center;gap:10px">
            <div class="nv-item-valor">${mascarar(formatCurrency(valorOperacao), ocultar)}</div>
            <button type="button" class="nv-link-muted" data-acao="excluir-operacao" data-id="${op.id}" aria-label="Excluir operação" style="color:var(--nv-negative)">✕</button>
          </div>
        </div>`;
        })
        .join('')
    : '<p class="nv-vazio">Nenhuma operação lançada ainda.</p>';

  return `
    <div class="nv-header nv-header--back">
      <button type="button" class="nv-back" data-acao="fechar-ativo" aria-label="Voltar">${'‹'}</button>
      ${monogramaAtivo(investimento.nome, 24)}
      <span class="nv-title">${escapeHtml(investimento.nome)}</span>
      <button type="button" class="nv-gear" data-acao="editar-investimento" data-id="${investimento.id}" aria-label="Editar ativo" style="margin-left:auto">${iconGear(19)}</button>
    </div>
    <div class="nv-hero" style="border-bottom:1px solid var(--nv-rule-soft)">
      <div class="nv-hero-label">VALOR ATUAL</div>
      <div class="nv-hero-value">
        <span class="cifrao" style="font-size:18px">R$</span>
        <span class="numero" style="font-size:48px">${mascarar(formatNumero(resumo.valorAtual), ocultar)}</span>
      </div>
      <div class="nv-carteira-badge-row">
        <span class="nv-carteira-badge">${formatPercent(resumo.rendimentoPercentual)}</span>
        <span class="nv-item-meta ${classeRend}">${resumo.rendimentoValor >= 0 ? '+' : '−'} ${mascarar(formatCurrency(Math.abs(resumo.rendimentoValor)), ocultar)} sobre ${mascarar(formatCurrency(resumo.valorInvestido), ocultar)}</span>
      </div>
      ${totalProventos ? `<div class="nv-hero-sub">Proventos recebidos: ${mascarar(formatCurrency(totalProventos), ocultar)}</div>` : ''}
    </div>
    <div class="nv-cells">
      <div class="nv-cell">
        <div class="nv-cell-label">QUANTIDADE</div>
        <div class="nv-cell-valor">${mascarar(formatNumero(resumo.quantidade), ocultar)}</div>
      </div>
      <div class="nv-cell">
        <div class="nv-cell-label">PREÇO MÉDIO</div>
        <div class="nv-cell-valor">${mascarar(formatCurrency(resumo.precoMedio), ocultar)}</div>
      </div>
    </div>
    <div class="nv-section-head">
      <span class="nv-section-label">OPERAÇÕES</span>
      <button type="button" class="nv-link-accent" data-acao="nova-operacao" data-id="${investimento.id}">+ NOVA OPERAÇÃO</button>
    </div>
    <div>${listaOperacoes}</div>
    <div class="nv-section-head">
      <span class="nv-section-label">PRÓXIMOS DIVIDENDOS</span>
      <button type="button" class="nv-link-accent" data-acao="novo-provento-previsto" data-id="${investimento.id}">+ NOVO PREVISTO</button>
    </div>
    <div>${
      dividendosPrevistos.length
        ? dividendosPrevistos
            .map((p) => {
              const dataFmt = p.data.split('-').reverse().slice(0, 2).join('/');
              return `
        <div class="nv-conta-linha" data-id="${p.id}">
          <div>
            <div class="nv-item-nome">${dataFmt}${p.descricao ? ` · ${escapeHtml(p.descricao)}` : ''}</div>
          </div>
          <div style="display:flex;align-items:center;gap:10px">
            <div class="nv-item-valor">${mascarar(formatCurrency(p.valor), ocultar)}</div>
            <button type="button" class="nv-link-muted" data-acao="excluir-provento-previsto" data-id="${p.id}" aria-label="Excluir dividendo previsto" style="color:var(--nv-negative)">✕</button>
          </div>
        </div>`;
            })
            .join('')
        : '<p class="nv-vazio">Nenhum dividendo previsto cadastrado.</p>'
    }</div>
    <div class="nv-section-head">
      <span class="nv-section-label">PROVENTOS</span>
      <button type="button" class="nv-link-accent" data-acao="novo-provento" data-id="${investimento.id}">+ NOVO PROVENTO</button>
    </div>
    <div>${listaProventos}</div>
    ${tabBar('carteira', state.idioma)}
  `;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    formatCurrency,
    formatNumero,
    formatPercent,
    formatAnos,
    renderCalendario,
    renderDiaDetalhe,
    renderEntradaRapida,
    renderPerguntasPerfil,
    renderResultadoPerfil,
    escapeHtml,
    mascarar,
    renderResumo,
    renderLancamentos,
    renderNovoLancamento,
    renderCategoriaDetalhe,
    renderMetas,
    renderConfiguracoes,
    renderImportarPlanilha,
    renderPin,
    renderComboSelect,
    renderComboBusca,
    renderComboItens,
    opcoesTipoInvestimento,
    renderAbertura,
    renderInvestimentos,
    renderAtivoDetalhe,
    ROTULOS_TIPO_INVESTIMENTO,
    ROTULOS_TIPO_CONTA,
    MESES,
    renderCalculadoras,
    monogramaAtivo,
  };
}
