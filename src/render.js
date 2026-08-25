const L = typeof require !== 'undefined' ? require('./logic.js') : window;

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

function formatCurrency(valor) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
}

function formatNumero(valor) {
  return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(valor);
}

function formatPercent(valor) {
  const formatado = formatNumero(valor);
  return `${valor >= 0 ? '+' : ''}${formatado}%`;
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

function iconGear(size = 18) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>`;
}

function tabBar(abaAtiva) {
  const itens = [
    { id: 'resumo', rotulo: 'RESUMO' },
    { id: 'lancamentos', rotulo: 'LANÇAM.' },
    { id: 'carteira', rotulo: 'CARTEIRA' },
    { id: 'metas', rotulo: 'METAS' },
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

function headerResumo(ano, mes) {
  return `
    <div class="nv-header nv-header--brand">
      <div class="nv-brand">
        ${iconSymbol(26)}
        <span class="nv-wordmark">NUVRA</span>
      </div>
      <div class="nv-monthnav">
        <button type="button" data-acao="mes-anterior" aria-label="Mês anterior">${'‹'}</button>
        <span>${MESES[mes - 1].slice(0, 3).toUpperCase()} ${ano}</span>
        <button type="button" data-acao="mes-seguinte" aria-label="Próximo mês">${'›'}</button>
        <button type="button" class="nv-gear" data-acao="abrir-configuracoes" aria-label="Configurações">${iconGear(19)}</button>
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

  const barrasCategoria = categorias.length
    ? categorias
        .map(
          (c, i) => `
        <button type="button" class="nv-bar-row" data-acao="abrir-categoria" data-categoria="${escapeHtml(c.categoria)}">
          <div class="nv-bar-top"><span>${escapeHtml(c.categoria)}</span><span>${mascarar(formatNumero(c.valor), ocultar)}</span></div>
          <div class="nv-bar-track"><div class="nv-bar-fill" style="width:${maiorCategoria ? (c.valor / maiorCategoria) * 100 : 0}%;background:${i === 0 ? 'var(--nv-accent)' : 'var(--nv-bar-neutral-strong)'}"></div></div>
        </button>`
        )
        .join('')
    : '<p class="nv-vazio">Nenhuma despesa neste mês ainda.</p>';

  const listaParcelas = abertas.length
    ? abertas
        .map(
          (p) => `
        <div class="nv-row-plain">
          <span>${escapeHtml(p.descricao)} <small>${p.numeroParcela}/${p.parcelas}</small></span>
          <span>${mascarar(formatNumero(p.valorParcela), ocultar)}</span>
        </div>`
        )
        .join('')
    : '<p class="nv-vazio">Nenhuma parcela em aberto neste mês.</p>';

  return `
    ${headerResumo(ano, mes)}
    <div class="nv-hero">
      <div class="nv-hero-label">SALDO DO MÊS</div>
      <div class="nv-hero-value">
        <span class="cifrao">R$</span>
        <span class="numero">${mascarar(formatNumero(resumo.saldo), ocultar)}</span>
      </div>
      <div class="nv-hero-sub">${variacao >= 0 ? '+' : '−'} ${mascarar(formatCurrency(Math.abs(variacao)), ocultar)} em relação a ${MESES[(mes - 2 + 12) % 12].toLowerCase()}</div>
    </div>
    ${sparkline(historico)}
    <div class="nv-cells">
      <div class="nv-cell">
        <div class="nv-cell-label">RECEITAS</div>
        <div class="nv-cell-valor">${mascarar(formatNumero(resumo.receitas), ocultar)}</div>
      </div>
      <div class="nv-cell">
        <div class="nv-cell-label">DESPESAS</div>
        <div class="nv-cell-valor" style="color:var(--nv-negative)">${mascarar(formatNumero(resumo.despesas), ocultar)}</div>
      </div>
      <div class="nv-cell">
        <div class="nv-cell-label">CARTEIRA</div>
        <div class="nv-cell-valor">${mascarar(formatNumero(carteira.totalAtual), ocultar)}</div>
      </div>
    </div>
    <div class="nv-section-head">
      <span class="nv-section-label">GASTOS POR CATEGORIA</span>
      <button type="button" class="nv-link-accent" data-acao="ir-tab" data-tab="lancamentos">VER TUDO</button>
    </div>
    <div class="nv-bars">${barrasCategoria}</div>
    <div class="nv-section-head">
      <span class="nv-section-label">PARCELAS EM ABERTO</span>
    </div>
    <div class="nv-list-plain">${listaParcelas}</div>
    ${tabBar('resumo')}
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
            <div class="nv-item-nome">${escapeHtml(l.descricao)}${tag}</div>
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
    ${tabBar('lancamentos')}
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
        <input type="text" id="campo-descricao" name="descricao" required maxlength="80" value="${escapeHtml(d.descricao || '')}" />
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
            <div class="nv-item-nome">${escapeHtml(l.descricao)}</div>
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
    ${tabBar('resumo')}
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
    ${tabBar('metas')}
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

function renderConfiguracoes(state, temPin) {
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
        <span class="nv-item-meta">${escapeHtml(ROTULOS_TIPO_CONTA[c.tipo] || c.tipo)}${c.fechamento ? ` · fecha dia ${c.fechamento}` : ''}</span>
        <button type="button" class="nv-link-muted" data-acao="excluir-conta" data-id="${c.id}" aria-label="Remover conta">✕</button>
      </span>
    </div>`
    )
    .join('');

  return `
    ${headerVoltar('Configurações', 'fechar-configuracoes')}
    <div class="nv-perfil">
      <div class="nv-avatar">${iconSymbol(24, 'var(--nv-fg-inverse)', 'var(--nv-accent)')}</div>
      <div>
        <div class="nv-perfil-nome">Minha conta</div>
        <div class="nv-perfil-sub">dados sincronizados neste Artifact</div>
      </div>
    </div>
    <div class="nv-section-head" style="padding-bottom:0"><span class="nv-section-label">APARÊNCIA</span></div>
    <div style="padding:8px 20px 16px">
      <div class="nv-segmentado-tema">
        <button type="button" data-acao="definir-tema" data-tema="claro" class="${tema === 'claro' ? 'ativo' : ''}">CLARO</button>
        <button type="button" data-acao="definir-tema" data-tema="escuro" class="${tema === 'escuro' ? 'ativo' : ''}">ESCURO</button>
        <button type="button" data-acao="definir-tema" data-tema="sistema" class="${tema === 'sistema' ? 'ativo' : ''}">SISTEMA</button>
      </div>
    </div>
    <div class="nv-section-head" style="padding-top:8px;padding-bottom:8px;border-top:1px solid var(--nv-rule-soft)"><span class="nv-section-label">CONTAS E CARTÕES</span></div>
    <div>${linhasContas}</div>
    <div class="nv-conta-linha" style="border-bottom:2px solid var(--nv-rule-strong)">
      <button type="button" class="nv-link-accent" data-acao="nova-conta" style="font-size:12px">ADICIONAR CONTA</button>
      <span class="mais" style="color:var(--nv-accent)">+</span>
    </div>
    <div class="nv-section-head" style="padding-bottom:8px"><span class="nv-section-label">DADOS</span></div>
    <div class="nv-dado-linha"><span>Sincronização</span><span class="nv-item-meta" id="status-sincronizacao">verificando…</span></div>
    <div class="nv-dado-linha">
      <span>Ocultar valores</span>
      <label class="nv-switch-wrap">
        <input type="checkbox" id="campo-ocultar-valores" ${ocultar ? 'checked' : ''} />
        <span class="nv-switch"><span class="knob"></span></span>
      </label>
    </div>
    <div class="nv-section-head" style="padding-top:8px;padding-bottom:8px;border-top:1px solid var(--nv-rule-soft)"><span class="nv-section-label">SEGURANÇA</span></div>
    <div class="nv-dado-linha">
      <span>PIN de acesso</span>
      <span style="display:flex;gap:14px;align-items:center">
        <span class="nv-item-meta">${temPin ? 'Ativado' : 'Desativado'}</span>
        <button type="button" class="nv-link-accent" data-acao="definir-pin" style="font-size:11px">${temPin ? 'ALTERAR' : 'DEFINIR'}</button>
        ${temPin ? '<button type="button" class="nv-link-muted" data-acao="remover-pin" style="font-size:11px;color:var(--nv-negative)">REMOVER</button>' : ''}
      </span>
    </div>
    <div class="nv-rodape-versao">NUVRA 1.0.0</div>
  `;
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

  const itens = resumos.length
    ? resumos
        .map(({ investimento: i, resumo: r }) => {
          const classe = r.rendimentoValor > 0 ? 'positivo' : r.rendimentoValor < 0 ? 'negativo' : '';
          const rotuloTipo = ROTULOS_TIPO_INVESTIMENTO[i.tipo] || i.tipo;
          return `
        <div class="nv-ativo-linha" data-id="${i.id}" data-acao="abrir-ativo">
          <div>
            <div class="nv-item-nome">${escapeHtml(i.nome)}</div>
            <div class="nv-item-meta">${escapeHtml(rotuloTipo)} · investido ${mascarar(formatCurrency(r.valorInvestido), ocultar)}</div>
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
    ${tabBar('carteira')}
  `;
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
      <span class="nv-section-label">PROVENTOS</span>
      <button type="button" class="nv-link-accent" data-acao="novo-provento" data-id="${investimento.id}">+ NOVO PROVENTO</button>
    </div>
    <div>${listaProventos}</div>
    ${tabBar('carteira')}
  `;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    formatCurrency,
    formatNumero,
    formatPercent,
    escapeHtml,
    mascarar,
    renderResumo,
    renderLancamentos,
    renderNovoLancamento,
    renderCategoriaDetalhe,
    renderMetas,
    renderConfiguracoes,
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
  };
}
