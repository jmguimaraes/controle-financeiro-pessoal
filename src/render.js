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
  // Atalho pra quem só quer registrar quanto tem guardado, sem transformar a reserva num ativo
  // com cotas e preço. O formulário simplifica os campos quando este tipo é escolhido.
  reserva_emergencia: 'Reserva de emergência',
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

// Ícones das abas: mesmo traço dos demais (24x24, stroke 2, pontas redondas), pra barra não
// destoar do resto. Preenchimento nenhum — só contorno, que é o que o app usa em todo lugar.
const ICONES_ABA = {
  resumo: '<path d="M3 10.5 12 3l9 7.5"></path><path d="M5.5 9.5V20h13V9.5"></path><path d="M9.5 20v-6h5v6"></path>',
  lancamentos: '<rect x="4" y="3" width="16" height="18" rx="2.5"></rect><line x1="8" y1="8" x2="16" y2="8"></line><line x1="8" y1="12" x2="16" y2="12"></line><line x1="8" y1="16" x2="13" y2="16"></line>',
  carteira: '<path d="M3 8.5A2.5 2.5 0 0 1 5.5 6H19a2 2 0 0 1 2 2v9a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17z"></path><path d="M3 8.5V7a2 2 0 0 1 2-2h11"></path><circle cx="17" cy="12.5" r="1.4"></circle>',
  metas: '<circle cx="12" cy="12" r="8.5"></circle><circle cx="12" cy="12" r="4.5"></circle><circle cx="12" cy="12" r="1"></circle>',
  calendario: '<rect x="3.5" y="5" width="17" height="16" rx="2.5"></rect><line x1="3.5" y1="10" x2="20.5" y2="10"></line><line x1="8" y1="3" x2="8" y2="6.5"></line><line x1="16" y1="3" x2="16" y2="6.5"></line>',
};

function iconeAba(id, tamanho = 21) {
  return `<svg width="${tamanho}" height="${tamanho}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONES_ABA[id] || ''}</svg>`;
}

function tabBar(abaAtiva, idioma) {
  const itens = [
    { id: 'resumo', rotulo: I18N.t('tabs.resumo', idioma) },
    { id: 'lancamentos', rotulo: I18N.t('tabs.lancamentos', idioma) },
    { id: 'carteira', rotulo: I18N.t('tabs.carteira', idioma) },
    { id: 'metas', rotulo: I18N.t('tabs.metas', idioma) },
    { id: 'calendario', rotulo: I18N.t('tabs.calendario', idioma) },
  ];
  return `
    <nav class="nv-tabbar--icones">
      ${itens
        .map(
          (item) => `
        <button type="button" data-acao="ir-tab" data-tab="${item.id}" class="${item.id === abaAtiva ? 'ativo' : ''}" aria-label="${escapeHtml(item.rotulo)}">${iconeAba(item.id)}<span>${escapeHtml(item.rotulo)}</span></button>`
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

// Os dois cabeçalhos escapam o próprio título. Antes o escape era responsabilidade de quem
// chamava, e só um dos seis chamadores tinha o que escapar — quem acrescentasse um cabeçalho com
// nome de conta ou de ativo herdaria um buraco sem perceber que existia essa regra.
function headerTituloMes(titulo, ano, mes) {
  return `
    <div class="nv-header">
      <span class="nv-title">${escapeHtml(titulo)}</span>
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
      <span class="nv-title">${escapeHtml(titulo)}</span>
    </div>`;
}

// Mostrada no lugar de uma tela que não conseguiu se desenhar (ver desenharTela em app.js).
// Diz o que houve e oferece a saída que resolve — recarregar descarta a alteração em memória que
// deixou o estado impossível, porque nada chega a ser gravado quando a renderização falha.
function renderFalhaDeTela(mensagem, aba, idioma) {
  return `
    <div class="nv-pilha">
      <section class="nv-cartao">
        <span class="nv-cartao-titulo">NÃO FOI POSSÍVEL MOSTRAR ESTA TELA</span>
        <p class="nv-perfil-resumo">
          Algo nos seus dados deixou esta tela impossível de montar. As outras abas continuam
          funcionando normalmente. Se isto apareceu logo depois de uma alteração, recarregar
          desfaz a alteração — ela não chega a ser gravada quando a tela falha.
        </p>
        ${mensagem ? `<p class="nv-item-meta" style="margin-top:12px">${escapeHtml(mensagem)}</p>` : ''}
      </section>
      <div class="nv-acao-fixa">
        <button type="button" class="nv-btn-contorno" data-acao="recarregar-app"><span>RECARREGAR</span></button>
      </div>
    </div>
    ${aba ? tabBar(aba, idioma) : ''}`;
}

// Alertas de comportamento (ver alertasFinanceiros em logic.js). Bloco inteiro some quando não há
// nada a dizer: alerta que aparece sempre vira moldura e para de ser lido.
function renderAlertas(alertas) {
  if (!alertas.length) return '';
  return `
    <section class="nv-cartao nv-cartao--justo">
      <div class="nv-cartao-topo"><span class="nv-cartao-titulo">Fique de olho</span></div>
      <div class="nv-alertas">
        ${alertas
          .map(
            (a) => `
          <div class="nv-alerta nv-alerta--${a.nivel}">
            <div class="nv-alerta-titulo">${escapeHtml(a.titulo)}</div>
            <div class="nv-alerta-detalhe">${escapeHtml(a.detalhe)}</div>
          </div>`
          )
          .join('')}
      </div>
    </section>`;
}

// Onda do saldo dos últimos meses, desenhada como área preenchida no rodapé do cartão de saldo.
// Antes era uma faixa separada logo abaixo do saldo, o que fazia o mês virar dois blocos: o
// número e "um gráfico". São a mesma informação — quanto sobrou, e vindo de onde.
function ondaSaldo(pontos) {
  const valores = pontos.map((p) => p.saldo);
  const min = Math.min(0, ...valores);
  const max = Math.max(0, ...valores);
  const amplitude = max - min || 1;
  const largura = 320;
  const altura = 56;
  const passo = pontos.length > 1 ? largura / (pontos.length - 1) : 0;
  const coords = pontos.map((p, i) => ({
    x: i * passo,
    y: altura - 4 - ((p.saldo - min) / amplitude) * (altura - 12),
  }));
  const linha = coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
  const area = `${linha} ${largura},${altura} 0,${altura}`;
  const ultimo = coords[coords.length - 1];
  return `
    <svg class="nv-saldo-onda" viewBox="0 0 ${largura} ${altura}" height="${altura}" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="nv-onda" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--nv-accent)" stop-opacity=".22"></stop>
          <stop offset="100%" stop-color="var(--nv-accent)" stop-opacity="0"></stop>
        </linearGradient>
      </defs>
      <polygon points="${area}" fill="url(#nv-onda)"></polygon>
      <polyline points="${linha}" fill="none" stroke="var(--nv-accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></polyline>
      <circle cx="${ultimo.x.toFixed(1)}" cy="${ultimo.y.toFixed(1)}" r="3.2" fill="var(--nv-accent)"></circle>
    </svg>`;
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

  // Os últimos lançamentos são o que dá vida à tela inicial: sem eles o Resumo é só um painel de
  // totais, e a pessoa precisa trocar de aba pra ver o que de fato aconteceu no mês.
  const ultimos = L.filtrarLancamentos(state.lancamentos, ano, mes, {}).slice(0, 4);
  const listaUltimos = ultimos.length
    ? ultimos
        .map((l) => {
          const sinal = l.tipo === 'receita' ? '+' : l.tipo === 'transferencia' ? '' : '−';
          const classe = l.tipo === 'receita' ? 'positivo' : l.tipo === 'transferencia' ? '' : 'negativo';
          const dataFmt = l.data.split('-').reverse().slice(0, 2).join('/');
          const sub = l.subcategoria ? `${l.categoria} › ${l.subcategoria}` : l.categoria;
          return `
        <button type="button" class="nv-linha nv-linha-botao" data-id="${escapeHtml(l.id)}" data-acao="editar-lancamento">
          <span>
            <span class="nv-linha-nome">${escapeHtml(l.descricao || l.categoria)}</span>
            <span class="nv-linha-meta" style="display:block">${dataFmt} · ${escapeHtml(sub)}</span>
          </span>
          <span class="nv-linha-valor ${classe}">${sinal} ${mascarar(formatNumero(L.parcelaValor(l), idioma), ocultar)}</span>
        </button>`;
        })
        .join('')
    : `<p class="nv-vazio" style="padding:8px 0">Nenhum lançamento neste mês ainda.</p>`;

  return `
    ${headerResumo(ano, mes, idioma)}
    <div class="nv-pilha">
      <section class="nv-cartao">
        <span class="nv-cartao-titulo">${I18N.t('resumo.saldoDoMes', idioma)}</span>
        <div class="nv-saldo-valor">
          <span class="cifrao">R$</span>
          <span class="numero">${mascarar(formatNumero(resumo.saldo, idioma), ocultar)}</span>
        </div>
        <div class="nv-saldo-sub">
          ${variacao >= 0 ? '▲' : '▼'} ${mascarar(formatCurrency(Math.abs(variacao), idioma), ocultar)}
          ${I18N.t('resumo.emRelacaoA', idioma)} ${meses[(mes - 2 + 12) % 12].toLowerCase()}
        </div>
        ${ondaSaldo(historico)}
      </section>

      <div class="nv-dupla">
        <section class="nv-cartao nv-cartao--justo">
          <span class="nv-num-rotulo"><span class="nv-ponto" style="background:var(--nv-positive)"></span>${I18N.t('resumo.receitas', idioma)}</span>
          <div class="nv-num-valor positivo">${mascarar(formatNumero(resumo.receitas, idioma), ocultar)}</div>
        </section>
        <section class="nv-cartao nv-cartao--justo">
          <span class="nv-num-rotulo"><span class="nv-ponto" style="background:var(--nv-negative)"></span>${I18N.t('resumo.despesas', idioma)}</span>
          <div class="nv-num-valor negativo">${mascarar(formatNumero(resumo.despesas, idioma), ocultar)}</div>
        </section>
      </div>

      <section class="nv-cartao nv-cartao--justo">${renderEntradaRapida()}</section>

      ${renderAlertas(L.alertasFinanceiros(state, ano, mes))}

      <section class="nv-cartao nv-cartao--justo">
        <div class="nv-cartao-topo">
          <span class="nv-cartao-titulo">${I18N.t('resumo.gastosPorCategoria', idioma)}</span>
          <button type="button" class="nv-link-accent" data-acao="ir-tab" data-tab="lancamentos">${I18N.t('resumo.verTudo', idioma)}</button>
        </div>
        <div class="nv-bars" style="padding:0">${barrasCategoria}</div>
      </section>

      <section class="nv-cartao nv-cartao--justo">
        <div class="nv-cartao-topo">
          <span class="nv-cartao-titulo">Últimos lançamentos</span>
          <button type="button" class="nv-link-accent" data-acao="ir-tab" data-tab="lancamentos">${I18N.t('resumo.verTudo', idioma)}</button>
        </div>
        ${listaUltimos}
      </section>

      <section class="nv-cartao nv-cartao--justo">
        <div class="nv-cartao-topo">
          <span class="nv-cartao-titulo">${I18N.t('resumo.carteira', idioma)}</span>
          <button type="button" class="nv-link-accent" data-acao="ir-tab" data-tab="carteira">${I18N.t('resumo.verTudo', idioma)}</button>
        </div>
        <div class="nv-num-valor">${mascarar(formatNumero(carteira.totalAtual, idioma), ocultar)}</div>
        <div class="nv-linha-meta" style="margin-top:4px">${carteira.rendimentoValor >= 0 ? '▲' : '▼'} ${formatPercent(carteira.rendimentoPercentual, idioma)} sobre ${mascarar(formatCurrency(carteira.totalInvestido, idioma), ocultar)}</div>
      </section>

      <section class="nv-cartao nv-cartao--justo">
        <div class="nv-cartao-topo"><span class="nv-cartao-titulo">${I18N.t('resumo.parcelasEmAberto', idioma)}</span></div>
        ${
          abertas.length
            ? abertas
                .map(
                  (p) => `
          <div class="nv-linha">
            <span>
              <span class="nv-linha-nome">${escapeHtml(p.descricao)}</span>
              <span class="nv-linha-meta" style="display:block">parcela ${p.numeroParcela} de ${p.parcelas} · faltam ${p.restantes}</span>
            </span>
            <span class="nv-linha-valor">${mascarar(formatNumero(p.valorParcela, idioma), ocultar)}</span>
          </div>`
                )
                .join('')
            : `<p class="nv-vazio" style="padding:8px 0">${I18N.t('resumo.semParcelas', idioma)}</p>`
        }
      </section>
    </div>
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
  const { busca = '', filtro = 'todos', contaSelecionada = null, pessoaSelecionada = null } = opcoes;
  const itens = L.filtrarLancamentos(state.lancamentos, ano, mes, {
    busca,
    filtro,
    contaId: contaSelecionada,
    pessoa: pessoaSelecionada,
  });
  const total = L.totalFiltrado(itens);
  const grupos = agruparPorDia(itens);
  // A lista sai de todos os lançamentos, não dos filtrados: senão escolher alguém esvaziaria o
  // próprio seletor. Só aparece depois que existe ao menos um nome — quem não usa o campo não vê.
  const pessoas = L.pessoasUsadas(state.lancamentos || []);

  const chips = [
    { id: 'todos', rotulo: 'TODOS' },
    { id: 'receitas', rotulo: 'RECEITAS' },
    { id: 'despesas', rotulo: 'DESPESAS' },
    { id: 'parcelados', rotulo: 'PARCELADOS' },
  ];

  // Um cartão por dia, com a data como rótulo no chão logo acima dele: no desenho antigo a data
  // era uma tarja cinza de ponta a ponta separando listas que corriam juntas. Aqui o próprio
  // cartão é a separação, e a data fica fora dele — dentro, com um só lançamento no dia, sobrava
  // um vão grande entre o título e a única linha.
  const listaGrupos = grupos.length
    ? grupos
        .map(
          (grupo) => `
        <div class="nv-pilha-titulo">${rotuloData(grupo.data)}</div>
        <section class="nv-cartao nv-cartao--justo">
        <div class="nv-lista">${grupo.itens
          .map((l) => {
            const tag = l.parcelas > 1 ? `<span class="nv-tag-parcela">${l.numeroParcela}/${l.parcelas}</span>` : '';
            const sinal = l.tipo === 'receita' ? '+' : '−';
            const classe = l.tipo === 'receita' ? 'positivo' : 'negativo';
            const conta = contas.find((c) => c.id === l.contaId);
            const metaConta = conta ? ` · ${escapeHtml(conta.nome)}` : '';
            const metaPessoa = l.pessoa ? ` · ${escapeHtml(l.pessoa)}` : '';
            const metaSub = l.subcategoria ? ` › ${escapeHtml(l.subcategoria)}` : '';
            return `
        <div class="nv-item-lanc" data-id="${escapeHtml(l.id)}" data-acao="editar-lancamento">
          <div>
            <div class="nv-item-nome">${escapeHtml(l.descricao || l.categoria)}${tag}</div>
            <div class="nv-item-meta">${escapeHtml(l.categoria)}${metaSub}${metaPessoa}${metaConta}</div>
          </div>
          <div class="nv-item-valor ${classe}">${sinal} ${mascarar(formatNumero(L.parcelaValor(l)), ocultar)}</div>
        </div>`;
          })
          .join('')}</div>
        </section>`
        )
        .join('')
    : '<section class="nv-cartao nv-cartao--justo"><p class="nv-vazio">Nenhum lançamento neste mês.</p></section>';

  return `
    ${headerTituloMes('Lançamentos', ano, mes)}
    <div class="nv-pilha">
      <div class="nv-busca">
        ${iconSearch()}
        <input type="search" id="campo-busca-lancamentos" placeholder="Buscar descrição ou categoria" value="${escapeHtml(busca)}" />
      </div>
      <div class="nv-chips">
        ${chips
          .map(
            (chip) => `<button type="button" class="nv-chip ${chip.id === filtro ? 'ativo' : ''}" data-acao="filtrar-lancamentos" data-filtro="${chip.id}">${chip.rotulo}</button>`
          )
          .join('')}
      </div>

      <section class="nv-cartao nv-cartao--justo">
        <span class="nv-cartao-titulo">TOTAL FILTRADO</span>
        <div class="nv-num-valor ${total >= 0 ? 'positivo' : 'negativo'}" style="font-size:26px">${total >= 0 ? '+' : '−'} ${mascarar(formatCurrency(Math.abs(total)), ocultar)}</div>
        <div class="nv-cells" style="margin-top:14px;padding-top:13px;border-top:1px solid var(--nv-surface-borda)">
          <div class="nv-cell">
            <div class="nv-cell-label" style="font-size:9px">CONTA</div>
            <select id="campo-conta-filtro" class="nv-select-inline">
              <option value="">Todas</option>
              ${contas.map((c) => `<option value="${c.id}" ${c.id === contaSelecionada ? 'selected' : ''}>${escapeHtml(c.nome)}</option>`).join('')}
            </select>
          </div>
          ${
            pessoas.length
              ? `<div class="nv-cell">
            <div class="nv-cell-label" style="font-size:9px">QUEM</div>
            <select id="campo-pessoa-filtro" class="nv-select-inline">
              <option value="">Todos</option>
              ${pessoas.map((p) => `<option value="${escapeHtml(p)}" ${p === pessoaSelecionada ? 'selected' : ''}>${escapeHtml(p)}</option>`).join('')}
            </select>
          </div>`
              : ''
          }
        </div>
      </section>

      ${listaGrupos}

      <div class="nv-acao-fixa">
        <button type="button" class="nv-btn-cheio" data-acao="novo-lancamento">
          <span class="mais">+</span><span>NOVO LANÇAMENTO</span>
        </button>
      </div>
    </div>
    ${tabBar('lancamentos', state.idioma)}
  `;
}

function opcoesCategoria(tipo) {
  const receitas = ['Salário', 'Freelance', 'Investimentos', 'Outras Receitas'];
  const despesas = ['Moradia', 'Alimentação', 'Transporte', 'Saúde', 'Educação', 'Lazer', 'Assinaturas', 'Vestuário', 'Outras Despesas'];
  return (tipo === 'receita' ? receitas : despesas).map((c) => ({ valor: c, rotulo: c }));
}

function renderNovoLancamento(state, dadosIniciais) {
  const contas = state.contas || [];
  const pessoas = L.pessoasUsadas(state.lancamentos || []);
  const d = dadosIniciais || {};
  const tipo = d.tipo || 'despesa';
  // Sugestões da categoria escolhida: "Mercado" só faz sentido dentro de Alimentação. Quando a
  // pessoa troca a categoria no formulário, app.js repõe esta lista (ver atualizarSugestoesSubcategoria).
  // Segue exatamente a mesma escolha que renderComboSelect faz pra exibir: a categoria do rascunho
  // quando ela é válida pro tipo, senão a primeira da lista. Isso cobre tanto o lançamento novo
  // (rascunho sem categoria) quanto a troca de despesa pra receita, em que a categoria antiga
  // deixa de existir — nos dois casos o campo exibiria uma categoria e sugeriria a de outra.
  const categoriasDoTipo = opcoesCategoria(tipo);
  const categoriaValida = categoriasDoTipo.some((o) => o.valor === d.categoria);
  const categoriaAtual = categoriaValida ? d.categoria : categoriasDoTipo[0] ? categoriasDoTipo[0].valor : '';
  const subcategorias = L.subcategoriasUsadas(state.lancamentos || [], categoriaAtual);
  const parcelado = (d.parcelas || 1) > 1;
  const saldoProjetado = d.saldoProjetado ?? 0;

  return `
    <div class="nv-header">
      <span class="nv-title">Lançamento</span>
      <button type="button" class="nv-link-muted" data-acao="cancelar-lancamento">CANCELAR</button>
    </div>
    <form id="formulario-lancamento" class="nv-pilha">
      <input type="hidden" name="id" value="${escapeHtml(d.id || '')}" />
      <div class="nv-segmentado">
        <button type="button" data-acao="tipo-lancamento" data-tipo="despesa" class="${tipo === 'despesa' ? 'ativo' : ''}">DESPESA</button>
        <button type="button" data-acao="tipo-lancamento" data-tipo="receita" class="${tipo === 'receita' ? 'ativo' : ''}">RECEITA</button>
        <button type="button" data-acao="tipo-lancamento" data-tipo="transferencia" class="${tipo === 'transferencia' ? 'ativo' : ''}">TRANSF.</button>
      </div>
      <input type="hidden" name="tipo" value="${escapeHtml(tipo)}" />
      <section class="nv-cartao">
        <span class="nv-cartao-titulo">VALOR TOTAL</span>
        <div class="nv-saldo-valor">
          <span class="cifrao">R$</span>
          <input type="text" inputmode="decimal" name="valorTotal" class="nv-campo-moeda" required value="${d.valorTotal ? formatNumero(d.valorTotal) : ''}" placeholder="0,00" />
        </div>
      </section>
      <section class="nv-cartao nv-cartao--justo">
        <div class="nv-campo-linha">
          <label class="nv-campo-label" for="campo-descricao">DESCRIÇÃO</label>
          <input type="text" id="campo-descricao" name="descricao" maxlength="80" value="${escapeHtml(d.descricao || '')}" />
        </div>
        <div class="nv-campo-linha">
          <label class="nv-campo-label" for="campo-categoria-lancamento">CATEGORIA</label>
          ${renderComboSelect('categoria', opcoesCategoria(tipo), d.categoria, 'campo-categoria-lancamento')}
        </div>
        <div class="nv-campo-linha">
          <label class="nv-campo-label" for="campo-subcategoria">SUBCATEGORIA</label>
          <input type="text" id="campo-subcategoria" name="subcategoria" maxlength="40" autocomplete="off"
            list="lista-subcategorias" placeholder="opcional, ex.: Mercado"
            value="${escapeHtml(d.subcategoria || '')}" />
          <datalist id="lista-subcategorias">${subcategorias.map((s) => `<option value="${escapeHtml(s)}">`).join('')}</datalist>
        </div>
        <div class="nv-campo-linha">
          <label class="nv-campo-label" for="campo-pessoa">QUEM GASTOU</label>
          <input type="text" id="campo-pessoa" name="pessoa" maxlength="40" autocomplete="off"
            list="lista-pessoas" placeholder="deixe em branco se for você"
            value="${escapeHtml(d.pessoa || '')}" />
          <datalist id="lista-pessoas">${pessoas.map((p) => `<option value="${escapeHtml(p)}">`).join('')}</datalist>
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
      </section>
      <section class="nv-cartao nv-cartao--justo">
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
      </section>
      ${
        d.id
          ? `<section class="nv-cartao nv-cartao--justo">
        <button type="button" class="nv-link-muted" data-acao="excluir-lancamento-atual" style="color:var(--nv-negative);font-size:13px;letter-spacing:0">Excluir lançamento</button>
      </section>`
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
  const meta = (state.metas || []).find((m) => m.categoria === categoria && !m.subcategoria);
  const statusMeta = meta ? L.statusMeta(total, meta.limite) : null;
  // Só vale mostrar a quebra quando alguém de fato subdividiu: com uma linha só ("Sem
  // subcategoria" com 100% do gasto) a seção não diria nada que o total acima já não diga.
  const porSubcategoria = L.gastosPorSubcategoria(state.lancamentos, categoria, ano, mes);
  const temSubcategoria = porSubcategoria.some((s) => s.subcategoria !== '');
  const maiorSub = Math.max(1, ...porSubcategoria.map((s) => s.valor));
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
        <div class="nv-item-lanc" data-id="${escapeHtml(l.id)}" data-acao="editar-lancamento">
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
    ${headerVoltar(categoria, 'fechar-categoria')}
    <div class="nv-pilha">
      <section class="nv-cartao">
        <span class="nv-cartao-titulo">GASTO EM ${MESES[mes - 1].toUpperCase()}</span>
        <div class="nv-saldo-valor">
          <span class="cifrao">R$</span>
          <span class="numero">${mascarar(formatNumero(total), ocultar)}</span>
        </div>
        <div class="nv-saldo-sub" style="gap:14px">
          <span>Média 6 meses ${mascarar(formatCurrency(media6), ocultar)}</span>
          <span style="color:${variacao >= 0 ? 'var(--nv-negative)' : 'var(--nv-positive)'}">${formatPercent(variacao)}</span>
        </div>
      </section>

      <section class="nv-cartao nv-cartao--justo">
        <div class="nv-cartao-topo"><span class="nv-cartao-titulo">SEIS MESES</span></div>
        <div class="nv-barras-meses">
          <div class="nv-barras-meses-grid">${barras}</div>
          <div class="nv-barras-eixo">${eixo}</div>
        </div>
      </section>
      ${
        meta
          ? `<section class="nv-cartao nv-cartao--justo">
        <div class="nv-meta-linha">
          <div>
            <span class="nv-cartao-titulo">META DO MÊS</span>
            <div class="nv-item-nome" style="margin-top:6px">${mascarar(formatCurrency(total), ocultar)} de ${mascarar(formatCurrency(meta.limite), ocultar)}</div>
          </div>
          <div class="nv-badge">${Math.round(statusMeta.percentual)}%</div>
        </div>
      </section>`
          : ''
      }
      ${
        temSubcategoria
          ? `<section class="nv-cartao nv-cartao--justo">
        <div class="nv-cartao-topo"><span class="nv-cartao-titulo">POR SUBCATEGORIA</span></div>
        <div class="nv-bars">
          ${porSubcategoria
            .map(
              (s) => `
            <div class="nv-bar-row">
              <div class="nv-bar-top">
                <span${s.subcategoria ? '' : ' style="color:var(--nv-muted)"'}>${s.subcategoria ? escapeHtml(s.subcategoria) : 'Sem subcategoria'}</span>
                <span>${mascarar(formatNumero(s.valor), ocultar)}</span>
              </div>
              <div class="nv-bar-track"><div class="nv-bar-fill" style="width:${(s.valor / maiorSub) * 100}%;background:${s.subcategoria ? 'var(--nv-bar-neutral-strong)' : 'var(--nv-bar-neutral)'}"></div></div>
            </div>`
            )
            .join('')}
        </div>
      </section>`
          : ''
      }
      <section class="nv-cartao nv-cartao--justo">
        <div class="nv-cartao-topo"><span class="nv-cartao-titulo">LANÇAMENTOS</span></div>
        <div class="nv-lista">${listaItens}</div>
      </section>
    </div>
    ${tabBar('resumo', state.idioma)}
  `;
}

function renderMetas(state, ano, mes) {
  const ocultar = !!state.ocultarValores;
  const metas = state.metas || [];
  // "Orçamento usado" compara o planejado com o gasto dentro do que foi planejado. Meta de
  // subcategoria é um recorte dentro da meta da categoria: quando as duas existem, só a da
  // categoria entra no total, senão o mesmo gasto entraria duas vezes de um lado e os dois
  // limites do outro. Antes das subcategorias o numerador somava TODA despesa do mês, inclusive
  // de categoria sem meta nenhuma — o que fazia o percentual estourar sem o orçamento ter
  // estourado. Agora os dois lados falam das mesmas metas.
  const categoriasComMetaPropria = new Set(metas.filter((m) => !m.subcategoria).map((m) => m.categoria));
  const metasDoTotal = metas.filter((m) => !m.subcategoria || !categoriasComMetaPropria.has(m.categoria));
  const totalLimite = metasDoTotal.reduce((s, m) => s + m.limite, 0);
  // Os limites somam por meta, mas o gasto soma por ESCOPO: duas metas na mesma categoria (dois
  // tetos pro mesmo bolso) medem o mesmo dinheiro, e somar as duas contaria o gasto em dobro.
  const gastoPorEscopo = new Map();
  for (const m of metasDoTotal) {
    const escopo = m.subcategoria ? `${m.categoria}›${m.subcategoria}` : m.categoria;
    if (!gastoPorEscopo.has(escopo)) gastoPorEscopo.set(escopo, L.gastoDaMeta(state.lancamentos, m, ano, mes));
  }
  const totalGasto = [...gastoPorEscopo.values()].reduce((s, v) => s + v, 0);
  const percentualGeral = totalLimite ? (totalGasto / totalLimite) * 100 : 0;
  const hoje = new Date();
  const ehMesAtual = hoje.getFullYear() === ano && hoje.getMonth() + 1 === mes;
  const diasNoMes = new Date(ano, mes, 0).getDate();
  const diasRestantes = ehMesAtual ? Math.max(0, diasNoMes - hoje.getDate()) : diasNoMes;

  const linhas = metas.length
    ? metas
        .map((m) => {
          const gasto = L.gastoDaMeta(state.lancamentos, m, ano, mes);
          const status = L.statusMeta(gasto, m.limite);
          const pctBarra = Math.min(100, status.percentual);
          const subtitulo = m.nome ? L.rotuloMeta({ ...m, nome: '' }) : '';
          return `
        <section class="nv-cartao nv-cartao--justo nv-meta-cartao ${status.excedeu ? 'excedida' : ''}" data-id="${escapeHtml(m.id)}" data-acao="editar-meta" role="button" tabindex="0">
          <div class="nv-meta-topo">
            <span>
              <span class="nv-meta-nome">${escapeHtml(m.nome || L.rotuloMeta(m))}</span>
              ${subtitulo ? `<div class="nv-item-meta">${escapeHtml(subtitulo)}</div>` : ''}
            </span>
            <span class="nv-meta-valores ${status.excedeu ? 'excedida' : ''}">${mascarar(formatNumero(gasto), ocultar)} / ${mascarar(formatNumero(m.limite), ocultar)}</span>
          </div>
          <div class="nv-meta-track"><div class="nv-meta-fill ${status.excedeu ? 'excedida' : ''}" style="width:${pctBarra}%"></div></div>
          ${status.excedeu ? `<div class="nv-meta-excesso">Excedeu ${mascarar(formatCurrency(status.excedente), ocultar)}</div>` : ''}
        </section>`;
        })
        .join('')
    : '<section class="nv-cartao nv-cartao--justo"><p class="nv-vazio">Nenhuma meta definida ainda.</p></section>';

  return `
    ${headerTituloMes('Metas', ano, mes)}
    <div class="nv-pilha">
      <section class="nv-cartao">
        <span class="nv-cartao-titulo">ORÇAMENTO USADO</span>
        <div class="nv-orcamento">
          <div class="nv-orcamento-num">
            <span class="grande">${Math.round(percentualGeral)}</span><span class="pct">%</span>
            <span class="detalhe">${mascarar(formatCurrency(totalGasto), ocultar)} de ${mascarar(formatCurrency(totalLimite), ocultar)}</span>
          </div>
          <div class="nv-orcamento-track"><div class="nv-orcamento-fill" style="width:${Math.min(100, percentualGeral)}%"></div></div>
          <div class="nv-orcamento-sub">${diasRestantes === 1 ? 'Falta 1 dia' : `Faltam ${diasRestantes} dias`} no mês</div>
        </div>
      </section>
      ${linhas}
      <div class="nv-acao-fixa" style="margin-top:auto">
        <button type="button" class="nv-btn-contorno" data-acao="nova-meta">
          <span class="mais">+</span><span>DEFINIR NOVA META</span>
        </button>
      </div>
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

  const celulasVazias = Array.from({ length: primeiroDiaSemana }, () => '<div class="nv-dia nv-dia-vazio"></div>').join('');
  const celulas = Array.from({ length: diasNoMes }, (unused, i) => {
    const dia = i + 1;
    const chave = `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
    const resumo = dias[chave];
    if (!resumo) return `<div class="nv-dia"><span class="nv-dia-numero">${dia}</span></div>`;
    const classe = resumo.saldo > 0 ? 'nv-dia-positivo' : resumo.saldo < 0 ? 'nv-dia-negativo' : '';
    const sinal = resumo.saldo > 0 ? '+' : resumo.saldo < 0 ? '−' : '';
    // Sem centavos aqui: a célula tem sete por linha e "4.500,00" não quebra, então o número
    // inteiro empurrava a coluna e a grade passava da largura do cartão — a coluna de sábado
    // saía cortada. Quem quer o valor exato do dia abre o dia, que é justamente o que a célula faz.
    const valor = new Intl.NumberFormat(I18N.localeDoIdioma(idioma), { maximumFractionDigits: 0 }).format(Math.abs(resumo.saldo));
    return `
      <button type="button" class="nv-dia ${classe}" data-acao="abrir-dia" data-dia="${chave}" aria-label="Dia ${dia}, ${sinal}${formatCurrency(Math.abs(resumo.saldo), idioma)}">
        <span class="nv-dia-numero">${dia}</span>
        <span class="nv-dia-valor">${ocultar ? OCULTO : `${sinal}${valor}`}</span>
      </button>`;
  }).join('');

  const totalMes = Object.values(dias).reduce((s, d) => s + d.saldo, 0);
  return `
    ${headerTituloMes('Calendário', ano, mes)}
    <div class="nv-pilha">
      <section class="nv-cartao">
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
      </section>
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
    <div class="nv-pilha">
      <section class="nv-cartao">
        <span class="nv-cartao-titulo">SALDO DO DIA</span>
        <div class="nv-saldo-valor">
          <span class="cifrao">R$</span>
          <span class="numero">${mascarar(formatNumero(saldo, idioma), ocultar)}</span>
        </div>
        <div class="nv-saldo-sub">
          entrou ${mascarar(formatCurrency(entrada, idioma), ocultar)} · saiu ${mascarar(formatCurrency(saida, idioma), ocultar)}
        </div>
      </section>
      <section class="nv-cartao nv-cartao--justo">
        <div class="nv-cartao-topo"><span class="nv-cartao-titulo">LANÇAMENTOS DO DIA</span></div>
        <div class="nv-lista">${lista}</div>
      </section>
    </div>`;
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

// Uma pergunta por vez, em tela cheia. O formulário com as catorze de uma vez cabia num diálogo
// só porque cada opção era um rádio minúsculo: ninguém lia, todo mundo enviava as respostas já
// marcadas por padrão e o resultado saía sempre igual. Aqui a opção é o alvo de toque, e a única
// coisa na tela é a pergunta que está sendo respondida.
function renderPerfilPergunta(indice, respostas = {}) {
  const perguntas = L.perguntasPerfil();
  const pergunta = perguntas[indice];
  if (!pergunta) return '';
  const escolhida = respostas[pergunta.id];
  const progresso = ((indice + 1) / perguntas.length) * 100;
  return `
    <div class="nv-header nv-header--back">
      <button type="button" class="nv-back" data-acao="voltar-perfil" aria-label="Voltar">${'‹'}</button>
      <span class="nv-title" style="font-size:17px">Perfil de investidor</span>
    </div>
    <div class="nv-pilha">
      <div class="nv-perfil-progresso">
        <span>PERGUNTA ${indice + 1} DE ${perguntas.length}</span>
        <div class="nv-perfil-barra"><i style="width:${progresso}%"></i></div>
      </div>
      <section class="nv-cartao">
        <h2 class="nv-perfil-pergunta">${escapeHtml(pergunta.pergunta)}</h2>
      </section>
      <div class="nv-perfil-opcoes" role="radiogroup" aria-label="${escapeHtml(pergunta.pergunta)}">
        ${pergunta.opcoes
          .map(
            (o) => `
        <button type="button" role="radio" aria-checked="${escolhida === o.pontos ? 'true' : 'false'}"
          class="nv-opcao ${escolhida === o.pontos ? 'escolhida' : ''}"
          data-acao="responder-perfil" data-pontos="${o.pontos}">
          <span class="nv-opcao-marca"></span>
          <span>${escapeHtml(o.texto)}</span>
        </button>`
          )
          .join('')}
      </div>
    </div>`;
}

// Tela de cálculo. O resultado sai de uma soma que roda em menos de um milissegundo — a espera é
// deliberada, pra separar "acabei de responder" de "este é o meu perfil". Sem ela o resultado
// aparece no mesmo toque da última opção e passa despercebido.
function renderPerfilCalculando() {
  return `
    <div class="nv-perfil-calculando">
      ${iconSymbol(56)}
      <div>
        <div class="nv-perfil-calculando-titulo">Montando seu perfil</div>
        <p class="nv-perfil-calculando-texto">Cruzando suas respostas sobre prazo, reserva e tolerância a oscilação.</p>
      </div>
      <div class="nv-perfil-carregando-barra" role="progressbar" aria-label="Calculando"><i></i></div>
    </div>`;
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
function renderResultadoPerfil(perfil, pontos, alocacao, pontosMaximos) {
  const maximo = pontosMaximos || L.pontosMaximosPerfil();
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
    <div class="nv-header nv-header--back">
      <button type="button" class="nv-back" data-acao="fechar-perfil" aria-label="Voltar">${'‹'}</button>
      <span class="nv-title" style="font-size:17px">Perfil de investidor</span>
    </div>
    <div class="nv-pilha nv-perfil-resultado">
      <section class="nv-cartao">
        <span class="nv-cartao-titulo">SEU PERFIL</span>
        <div class="nv-perfil-resultado-nome">${escapeHtml(ROTULO_PERFIL[perfil] || perfil)}</div>
        <div class="nv-perfil-pontos">${pontos} de ${maximo} pontos</div>
        <div class="nv-perfil-escala" aria-hidden="true"><i style="width:${maximo ? Math.min(100, (pontos / maximo) * 100) : 0}%"></i></div>
        <p class="nv-perfil-resumo">${escapeHtml(RESUMO_PERFIL[perfil] || '')}</p>
      </section>
      <section class="nv-cartao nv-cartao--justo">
        <div class="nv-cartao-topo"><span class="nv-cartao-titulo">SUGESTÃO DE ALOCAÇÃO POR CLASSE</span></div>
        <div class="nv-list-plain">${linhas}</div>
      </section>
      <section class="nv-cartao nv-cartao--justo">
        <p class="nv-perfil-aviso">
          Isto é material educativo e não é recomendação de investimento. A sugestão distribui
          percentuais por classe de ativo e não indica nenhum ativo específico. Decisões de
          investimento são suas; se precisar de orientação, procure um profissional habilitado.
        </p>
      </section>
      <div class="nv-acao-fixa">
        <button type="button" class="nv-btn-cheio" data-acao="aplicar-alocacao-perfil">
          <span>USAR COMO MINHA META</span>
        </button>
      </div>
      <div class="nv-acao-fixa">
        <button type="button" class="nv-btn-contorno" data-acao="refazer-perfil"><span>REFAZER O TESTE</span></button>
      </div>
    </div>`;
}

// --- Tela de calculadoras ---
// Ferramentas de apoio, sem ligação com os dados do usuário (não lê nem grava lançamento,
// investimento etc.) — por isso não recebe `state`. O cálculo em si roda no clique do botão
// (em app.js), lendo os campos direto do DOM; esta função só desenha o formulário e a área de
// resultado (vazia/oculta até o primeiro clique).

// Cada calculadora é um cartão: título, campos e o botão logo abaixo. O resultado entra num
// cartão próprio, escondido até o primeiro cálculo — cartão vazio de saída na tela seria ruído.
function cartaoCalculo(titulo, campos, acao, idResultado) {
  return `
    <section class="nv-cartao nv-cartao--justo">
      <div class="nv-cartao-topo"><span class="nv-cartao-titulo">${titulo}</span></div>
      ${campos}
    </section>
    <div class="nv-acao-fixa">
      <button type="button" class="nv-btn-contorno" data-acao="${acao}"><span>CALCULAR</span></button>
    </div>
    <section class="nv-cartao nv-cartao--justo" id="${idResultado}" hidden></section>`;
}

function corpoJurosCompostos() {
  return cartaoCalculo(
    'JUROS COMPOSTOS',
    `
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
    </div>`,
    'calcular-compostos',
    'resultado-calc-compostos'
  );
}

function corpoJurosSimples() {
  return cartaoCalculo(
    'JUROS SIMPLES',
    `
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
    </div>`,
    'calcular-simples',
    'resultado-calc-simples'
  );
}

function corpoPorcentagem() {
  return `
    ${cartaoCalculo(
      'QUANTO É X% DE UM VALOR',
      `
    <div class="nv-campo-dupla">
      <div>
        <label class="nv-campo-label" for="campo-calc-pct1-percentual">PERCENTUAL (%)</label>
        <input type="text" inputmode="decimal" id="campo-calc-pct1-percentual" placeholder="15" />
      </div>
      <div>
        <label class="nv-campo-label" for="campo-calc-pct1-valor">VALOR (R$)</label>
        <input type="text" inputmode="decimal" id="campo-calc-pct1-valor" class="nv-campo-moeda" placeholder="0,00" />
      </div>
    </div>`,
      'calcular-pct1',
      'resultado-calc-pct1'
    )}
    ${cartaoCalculo(
      'QUE PERCENTUAL UM VALOR REPRESENTA DE UM TOTAL',
      `
    <div class="nv-campo-dupla">
      <div>
        <label class="nv-campo-label" for="campo-calc-pct2-valor">VALOR (R$)</label>
        <input type="text" inputmode="decimal" id="campo-calc-pct2-valor" class="nv-campo-moeda" placeholder="0,00" />
      </div>
      <div>
        <label class="nv-campo-label" for="campo-calc-pct2-total">TOTAL (R$)</label>
        <input type="text" inputmode="decimal" id="campo-calc-pct2-total" class="nv-campo-moeda" placeholder="0,00" />
      </div>
    </div>`,
      'calcular-pct2',
      'resultado-calc-pct2'
    )}
    ${cartaoCalculo(
      'AUMENTAR OU DIMINUIR UM VALOR EM X%',
      `
    <div class="nv-campo-dupla">
      <div>
        <label class="nv-campo-label" for="campo-calc-pct3-valor">VALOR (R$)</label>
        <input type="text" inputmode="decimal" id="campo-calc-pct3-valor" class="nv-campo-moeda" placeholder="0,00" />
      </div>
      <div>
        <label class="nv-campo-label" for="campo-calc-pct3-percentual">PERCENTUAL (use negativo p/ diminuir)</label>
        <input type="text" inputmode="decimal" id="campo-calc-pct3-percentual" placeholder="10 ou -10" />
      </div>
    </div>`,
      'calcular-pct3',
      'resultado-calc-pct3'
    )}`;
}

function corpoPrimeiroMilhao(modoMilhao) {
  const modo = modoMilhao === 'aporte' ? 'aporte' : 'tempo';
  return `
    <div class="nv-segmentado">
      <button type="button" data-acao="definir-modo-milhao" data-modomilhao="tempo" class="${modo === 'tempo' ? 'ativo' : ''}">TEMPO NECESSÁRIO</button>
      <button type="button" data-acao="definir-modo-milhao" data-modomilhao="aporte" class="${modo === 'aporte' ? 'ativo' : ''}">APORTE NECESSÁRIO</button>
    </div>
    ${cartaoCalculo(
      'PRIMEIRO MILHÃO',
      `
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
    }`,
      'calcular-milhao',
      'resultado-calc-milhao'
    )}`;
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
    <div class="nv-pilha">
      <div class="nv-segmentado">
        ${abas
          .map(
            (a) => `<button type="button" data-acao="definir-calculadora" data-calc="${a.id}" class="${a.id === modo ? 'ativo' : ''}">${a.rotulo}</button>`
          )
          .join('')}
      </div>
      <div id="corpo-calculadora" class="nv-pilha" style="padding:0">${corpo}</div>
    </div>`;
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
    <div class="nv-conta-linha" data-id="${escapeHtml(c.id)}">
      <span style="display:flex;align-items:center;gap:12px">
        <span class="nv-conta-marcador">${escapeHtml((c.nome || '?').slice(0, 1).toUpperCase())}</span>
        <span class="nv-item-nome">${escapeHtml(c.nome)}</span>
      </span>
      <span style="display:flex;align-items:center;gap:10px">
        <span class="nv-item-meta">${escapeHtml(rotuloTipoConta(c.tipo, idioma))}${c.fechamento ? ` · ${I18N.t('config.fechaDia', idioma)} ${c.fechamento}` : ''}</span>
        <button type="button" class="nv-link-muted" data-acao="excluir-conta" data-id="${escapeHtml(c.id)}" aria-label="Remover conta">✕</button>
      </span>
    </div>`
    )
    .join('');

  return `
    ${headerVoltar(I18N.t('config.titulo', idioma), 'fechar-configuracoes')}
    <div class="nv-pilha">
      <section class="nv-cartao nv-cartao--justo">
        <div class="nv-perfil">
          <div class="nv-avatar">${iconSymbol(24, 'var(--nv-fg-inverse)', 'var(--nv-accent)')}</div>
          <div>
            <div class="nv-perfil-nome">${I18N.t('config.minhaConta', idioma)}</div>
            <div class="nv-perfil-sub">${I18N.t('config.dadosSincronizados', idioma)}</div>
          </div>
        </div>
      </section>

      <div class="nv-pilha-titulo">${I18N.t('config.aparencia', idioma)}</div>
      <div class="nv-segmentado-tema">
        <button type="button" data-acao="definir-tema" data-tema="claro" class="${tema === 'claro' ? 'ativo' : ''}">${iconSol(16)}<span>${I18N.t('config.claro', idioma)}</span></button>
        <button type="button" data-acao="definir-tema" data-tema="escuro" class="${tema === 'escuro' ? 'ativo' : ''}">${iconLua(16)}<span>${I18N.t('config.escuro', idioma)}</span></button>
        <button type="button" data-acao="definir-tema" data-tema="sistema" class="${tema === 'sistema' ? 'ativo' : ''}">${iconMonitor(16)}<span>${I18N.t('config.sistema', idioma)}</span></button>
      </div>

      <div class="nv-pilha-titulo">${I18N.t('config.idioma', idioma)}</div>
      <div class="nv-segmentado-tema">
        ${I18N.listaIdiomas()
          .map(
            (cod) =>
              `<button type="button" data-acao="definir-idioma" data-idioma="${cod}" class="${(idioma || 'pt') === cod ? 'ativo' : ''}"><span>${NOME_PROPRIO_IDIOMA[cod]}</span></button>`
          )
          .join('')}
      </div>

      <div class="nv-pilha-titulo">${I18N.t('config.contasCartoes', idioma)}</div>
      <section class="nv-cartao nv-cartao--justo">
        <div class="nv-lista">
          ${linhasContas}
          <div class="nv-conta-linha">
            <button type="button" class="nv-link-accent" data-acao="nova-conta" style="font-size:12px">${I18N.t('config.adicionarConta', idioma)}</button>
            <span class="mais" style="color:var(--nv-accent);font-size:18px">+</span>
          </div>
        </div>
      </section>

      <div class="nv-pilha-titulo">${I18N.t('config.dados', idioma)}</div>
      <section class="nv-cartao nv-cartao--justo">
        <div class="nv-lista">
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
        </div>
      </section>

      <div class="nv-pilha-titulo">${I18N.t('config.seguranca', idioma)}</div>
      <section class="nv-cartao nv-cartao--justo">
        <div class="nv-dado-linha" style="padding:0;border:none">
          <span>${I18N.t('config.pinAcesso', idioma)}</span>
          <span style="display:flex;gap:14px;align-items:center">
            <span class="nv-item-meta">${temPin ? I18N.t('config.ativado', idioma) : I18N.t('config.desativado', idioma)}</span>
            <button type="button" class="nv-link-accent" data-acao="definir-pin" style="font-size:11px">${temPin ? I18N.t('config.alterar', idioma) : I18N.t('config.definir', idioma)}</button>
            ${temPin ? `<button type="button" class="nv-link-muted" data-acao="remover-pin" style="font-size:11px;color:var(--nv-negative)">${I18N.t('config.remover', idioma)}</button>` : ''}
          </span>
        </div>
        <!-- O PIN esconde a tela, não protege o dado: ele fica em claro no armazenamento do
             navegador, e a checagem roda no próprio aparelho. Dizer isso na tela é parte do
             controle — sem essa linha o rótulo "Segurança" promete o que o recurso não entrega. -->
        <p class="nv-item-meta" style="margin:12px 0 0;line-height:1.5">${I18N.t('config.pinExplicacao', idioma)}</p>
      </section>

      <div class="nv-rodape-versao">NUVRA 1.0.0</div>
    </div>
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
      ? `<section class="nv-cartao nv-cartao--justo">
           <div class="nv-cartao-topo"><span class="nv-cartao-titulo">LINHAS IGNORADAS</span></div>
           <div class="nv-lista">${ignoradas
             .map(
               (ig) =>
                 `<div class="nv-dado-linha"><span>Linha ${ig.linha}</span><span class="nv-item-meta">${escapeHtml(ig.motivo)}</span></div>`
             )
             .join('')}</div>
         </section>`
      : '';
    return `
      ${voltar}
      <div class="nv-pilha">
        <section class="nv-cartao">
          <span class="nv-cartao-titulo">IMPORTADOS</span>
          <div class="nv-saldo-valor"><span class="numero">${total}</span></div>
          <div class="nv-saldo-sub">
            ${total} lançamento${total === 1 ? '' : 's'} adicionado${total === 1 ? '' : 's'}${
              ignoradas.length ? ` · ${ignoradas.length} ignorada${ignoradas.length === 1 ? '' : 's'}` : ''
            }
          </div>
        </section>
        ${listaIgnoradas}
        <section class="nv-cartao nv-cartao--justo">
          <p class="nv-item-meta" style="margin:0;line-height:1.5">
            Confira em Lançamentos. Importar o mesmo arquivo de novo cria lançamentos duplicados — não há verificação de repetidos.
          </p>
        </section>
        <div class="nv-acao-fixa">
          <button type="button" class="nv-btn-contorno" data-acao="fechar-importar"><span>CONCLUIR</span></button>
        </div>
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
      <div style="overflow-x:auto">
        <table style="border-collapse:collapse;font-size:11px;width:100%">
          <thead><tr>${imp.colunas
            .map(
              (c) =>
                `<th style="text-align:left;padding:6px 12px 6px 0;border-bottom:1px solid var(--nv-surface-borda);white-space:nowrap">${escapeHtml(c)}</th>`
            )
            .join('')}</tr></thead>
          <tbody>${imp.linhas
            .slice(0, 6)
            .map(
              (l) =>
                `<tr>${imp.colunas
                  .map(
                    (unused, i) =>
                      `<td style="padding:6px 12px 6px 0;border-bottom:1px solid var(--nv-surface-borda);white-space:nowrap">${escapeHtml(l[i] || '')}</td>`
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
      <div class="nv-pilha">
        <section class="nv-cartao nv-cartao--justo">
          <div class="nv-cartao-topo"><span class="nv-cartao-titulo">${imp.linhas.length} LINHA${
            imp.linhas.length === 1 ? '' : 'S'
          } ENCONTRADA${imp.linhas.length === 1 ? '' : 'S'}</span></div>
          ${tabela}
        </section>
        <section class="nv-cartao nv-cartao--justo">
          <div class="nv-cartao-topo"><span class="nv-cartao-titulo">DE QUAL COLUNA VEM CADA CAMPO</span></div>
          ${campo('map-data', 'DATA', imp.sugestao.data, true)}
          ${campo('map-valor', 'VALOR', imp.sugestao.valor, true)}
          ${campo('map-descricao', 'DESCRIÇÃO', imp.sugestao.descricao, false)}
          ${campo('map-categoria', 'CATEGORIA', imp.sugestao.categoria, false)}
          ${campo('map-subcategoria', 'SUBCATEGORIA', imp.sugestao.subcategoria, false)}
          ${campo('map-parcelas', 'PARCELAS', imp.sugestao.parcelas, false)}
          ${contas.length ? campo('map-conta', 'CONTA', imp.sugestao.conta, false) : ''}
          ${seletorContaPadrao}
        </section>
        <section class="nv-cartao nv-cartao--justo">
          <p class="nv-item-meta" style="margin:0;line-height:1.5">
            Valor negativo vira despesa; positivo, receita. Sem coluna de categoria, o Nuvra adivinha pela descrição. Uma coluna de conta na planilha, quando o nome bate com uma das suas contas, tem prioridade sobre a conta escolhida acima.
          </p>
        </section>
        <div class="nv-acao-fixa">
          <button type="button" class="nv-btn-contorno" data-acao="confirmar-importacao"><span>IMPORTAR LANÇAMENTOS</span></button>
        </div>
      </div>`;
  }

  return `
    ${voltar}
    <div class="nv-pilha">
      <section class="nv-cartao">
        <p style="font-size:13px;color:var(--nv-muted);line-height:1.5;margin:0 0 16px">
          Exporte sua planilha como CSV (no Excel: <strong>Salvar como → CSV</strong>) e escolha o arquivo abaixo. Cada linha com data e valor vira um lançamento. Nada sai do aparelho — o arquivo é lido aqui mesmo.
        </p>
        <input type="file" id="campo-arquivo-csv" accept=".csv,text/csv,text/plain" style="font-size:13px;width:100%" />
      </section>
      <section class="nv-cartao">
        <span class="nv-cartao-titulo">OU COLE O CONTEÚDO</span>
        <textarea id="campo-texto-csv" rows="6" placeholder="data,descrição,valor&#10;01/08/2026,Mercado,-89,90" style="width:100%;margin-top:12px;font-family:inherit;font-size:13px;padding:12px;border:1px solid var(--nv-surface-borda);border-radius:var(--nv-raio-interno);background:var(--nv-surface-2);color:var(--nv-fg);resize:vertical;box-sizing:border-box"></textarea>
      </section>
      <div class="nv-acao-fixa">
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
  // Anel mais fino que a versão anterior (era 20): grosso demais, a rosca virava um pneu e sobrava
  // pouco vazio no meio pra colocar o total.
  const espessura = 13;
  // Fatias encostadas com corte reto ficavam num bloco só, sem leitura de onde uma acaba. O vão é
  // descontado do comprimento de cada fatia, então a proporção continua honesta — o que a fatia
  // perde de arco ela não ganha em outro lugar.
  const vao = composicao.length > 1 ? 4 : 0;
  // O traço é centrado no raio, então metade da espessura fica PARA FORA dele: a borda externa
  // do desenho está em raio + espessura/2, não em raio. Com viewBox fixo em 120 e raio 52, essa
  // borda caía em 62 contra um limite de 60 e a rosca aparecia cortada nos quatro lados. O
  // viewBox agora é calculado a partir do raio, então mexer no raio ou na espessura não volta a
  // cortar. O +2 é folga pra antisserrilhado não comer a borda exatamente no limite.
  const bordaExterna = raio + espessura / 2;
  const tamanho = bordaExterna * 2 + 2;
  const centro = tamanho / 2;
  const circunferencia = 2 * Math.PI * raio;
  let acumulado = 0;
  const segmentos = composicao
    .map((c, i) => {
      const fracao = total ? c.valor / total : 0;
      const arco = fracao * circunferencia;
      // A ponta arredondada acrescenta meia espessura em cada extremidade, então o desenho fica
      // mais comprido que o traço pedido. Descontar a espessura inteira faz o resultado VISÍVEL
      // medir exatamente "arco menos o vão" — sem isso as fatias se sobrepõem em vez de separar.
      // O início também anda meio vão + meia espessura, pra fatia ficar centrada no arco dela.
      const comprimento = Math.max(arco - vao - espessura, 0.01);
      const dashoffset = -(acumulado + vao / 2 + espessura / 2);
      acumulado += arco;
      return `<circle cx="${centro}" cy="${centro}" r="${raio}" fill="none" stroke="${cores[i % cores.length]}" stroke-width="${espessura}" stroke-linecap="round" stroke-dasharray="${comprimento.toFixed(2)} ${(circunferencia - comprimento).toFixed(2)}" stroke-dashoffset="${dashoffset.toFixed(2)}"></circle>`;
    })
    .join('');
  // A rotação vai no grupo do anel, não no <svg>: girando o svg inteiro, qualquer texto no centro
  // giraria junto e sairia deitado.
  return `
    <svg width="128" height="128" viewBox="0 0 ${tamanho} ${tamanho}" style="flex:none" role="img" aria-label="Gráfico de composição da carteira por tipo de ativo">
      <g transform="rotate(-90 ${centro} ${centro})">
        <circle cx="${centro}" cy="${centro}" r="${raio}" fill="none" stroke="var(--nv-hairline)" stroke-width="${espessura}"></circle>
        ${segmentos}
      </g>
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
        <div class="nv-ativo-linha" data-id="${escapeHtml(i.id)}" data-acao="abrir-ativo">
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
    <div class="nv-pilha">
      <section class="nv-cartao">
        <span class="nv-cartao-titulo">VALOR ATUAL</span>
        <div class="nv-saldo-valor">
          <span class="cifrao">R$</span>
          <span class="numero">${mascarar(formatNumero(carteira.totalAtual), ocultar)}</span>
        </div>
        <div class="nv-carteira-badge-row">
          <span class="nv-carteira-badge ${carteira.rendimentoValor < 0 ? 'nv-carteira-badge--negativo' : ''}">${formatPercent(carteira.rendimentoPercentual)}</span>
          <span class="nv-item-meta">${carteira.rendimentoValor >= 0 ? '+' : '−'} ${mascarar(formatCurrency(Math.abs(carteira.rendimentoValor)), ocultar)} sobre ${mascarar(formatCurrency(carteira.totalInvestido), ocultar)}</span>
        </div>
      </section>
      ${
        investimentos.length
          ? ''
          : `<div class="nv-perfil-convite">
              <div class="nv-perfil-convite-titulo">Não sabe por onde começar?</div>
              <p>Responda ${L.perguntasPerfil().length} perguntas rápidas, uma de cada vez, e descubra seu perfil de investidor. O app sugere uma divisão por classe de ativo pra você usar como meta.</p>
              <button type="button" class="nv-perfil-cta" data-acao="abrir-perfil">FAZER O TESTE</button>
            </div>`
      }
      ${
        composicao.length
          ? `<section class="nv-cartao nv-cartao--justo">
        <div class="nv-cartao-topo">
          <span class="nv-cartao-titulo">COMPOSIÇÃO</span>
          <button type="button" class="nv-link-accent" data-acao="editar-alocacao">METAS DE ALOCAÇÃO</button>
        </div>
        <div class="nv-composicao">
          <div class="nv-composicao-grafico">
            ${renderGraficoComposicao(composicao, totalComposicao, cores)}
            <div class="nv-composicao-legenda">
              ${composicao
                .map(
                  (c, i) =>
                    // O rótulo precisa ser um elemento próprio: como texto solto dentro do flex ele
                    // vira um item de largura mínima igual ao conteúdo, e um tipo de nome comprido
                    // empurrava o percentual pra fora do cartão em tela estreita.
                    `<div class="nv-composicao-item"><span class="nv-composicao-bolinha" style="background:${cores[i % cores.length]}"></span><span class="nv-composicao-rotulo">${escapeHtml(rotuloTipoInvestimento(c.tipo)).toUpperCase()}</span><b>${Math.round((c.valor / totalComposicao) * 100)}%</b></div>`
                )
                .join('')}
            </div>
          </div>
        </div>
      </section>`
          : ''
      }
      ${
        sugestao.length
          ? `<section class="nv-cartao nv-cartao--justo">
        <div class="nv-cartao-topo"><span class="nv-cartao-titulo">PRÓXIMO APORTE</span></div>
        <div class="nv-list-plain">
          ${sugestao
            .map(
              (s) => `<div class="nv-row-plain"><span>${escapeHtml(ROTULOS_TIPO_INVESTIMENTO[s.tipo] || s.tipo)}</span><span>faltam ${mascarar(formatCurrency(s.diferenca), ocultar)}</span></div>`
            )
            .join('')}
        </div>
      </section>`
          : ''
      }
      ${
        agendaDividendos.length
          ? `<section class="nv-cartao nv-cartao--justo">
        <div class="nv-cartao-topo"><span class="nv-cartao-titulo">PRÓXIMOS DIVIDENDOS</span></div>
        <div class="nv-list-plain">
          ${agendaDividendos
            .map((p) => {
              const dataFmt = p.data.split('-').reverse().slice(0, 2).join('/');
              return `<div class="nv-row-plain"><span>${escapeHtml(p.nome)} · ${dataFmt}</span><span>${mascarar(formatCurrency(p.valor), ocultar)}</span></div>`;
            })
            .join('')}
        </div>
      </section>`
          : ''
      }
      <section class="nv-cartao nv-cartao--justo">
        <div class="nv-cartao-topo">
          <span class="nv-cartao-titulo">MEUS ATIVOS</span>
          ${investimentos.length ? '<button type="button" class="nv-link-accent" data-acao="abrir-perfil">DESCOBRIR MEU PERFIL</button>' : ''}
        </div>
        <div class="nv-lista">${itens}</div>
      </section>
      <div class="nv-acao-fixa">
        <button type="button" class="nv-btn-contorno" data-acao="novo-investimento">
          <span class="mais">+</span><span>NOVO ATIVO</span>
        </button>
      </div>
      ${
        imposto.length
          ? `<section class="nv-cartao nv-cartao--justo">
        <div class="nv-cartao-topo"><span class="nv-cartao-titulo">IMPOSTO ESTIMADO — ${MESES[hoje.getMonth()].toUpperCase()}</span></div>
        <div class="nv-list-plain">
          ${imposto
            .map(
              (i) => `<div class="nv-row-plain"><span>${escapeHtml(ROTULOS_TIPO_INVESTIMENTO[i.tipo] || i.tipo)}${i.isento ? ' (isento)' : ` · ${Math.round(i.aliquota * 100)}%`}</span><span>${mascarar(formatCurrency(i.impostoEstimado), ocultar)}</span></div>`
            )
            .join('')}
        </div>
        <p class="nv-item-meta" style="margin-top:12px">Estimativa de apoio à decisão — não substitui o cálculo de um contador pra fins de DARF.</p>
      </section>`
          : ''
      }
      ${blocoDividas(state, investimentos, ocultar)}
      <div class="nv-acao-fixa">
        <button type="button" class="nv-btn-contorno" data-acao="nova-divida">
          <span class="mais">+</span><span>NOVA DÍVIDA</span>
        </button>
      </div>
    </div>
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
      <div class="nv-item" data-id="${escapeHtml(d.id)}" data-acao="editar-divida">
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
    <section class="nv-cartao">
      <span class="nv-cartao-titulo">PATRIMÔNIO LÍQUIDO</span>
      <div class="nv-patrimonio">
        <div class="nv-patrimonio-valor ${pl.negativo ? 'nv-negativo' : ''}">${mascarar(formatCurrency(pl.liquido), ocultar)}</div>
        <div class="nv-item-meta">${mascarar(formatCurrency(pl.ativos), ocultar)} em ativos − ${mascarar(formatCurrency(pl.dividas), ocultar)} em dívidas</div>
      </div>
    </section>
    <section class="nv-cartao nv-cartao--justo">
      <div class="nv-cartao-topo"><span class="nv-cartao-titulo">DÍVIDAS</span></div>
      <div class="nv-lista">${linhas}</div>
    </section>`;
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
        <div class="nv-conta-linha" data-id="${escapeHtml(p.id)}">
          <div>
            <div class="nv-item-nome">${p.tipo === 'jcp' ? 'JCP' : 'DIVIDENDO'} · ${dataFmt}</div>
          </div>
          <div style="display:flex;align-items:center;gap:10px">
            <div class="nv-item-valor">${mascarar(formatCurrency(p.valor), ocultar)}</div>
            <button type="button" class="nv-link-muted" data-acao="excluir-provento" data-id="${escapeHtml(p.id)}" aria-label="Excluir provento" style="color:var(--nv-negative)">✕</button>
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
        <div class="nv-conta-linha" data-id="${escapeHtml(op.id)}">
          <div>
            <div class="nv-item-nome">${op.tipo === 'compra' ? 'COMPRA' : 'VENDA'} · ${dataFmt}</div>
            <div class="nv-item-meta">${formatNumero(op.quantidade)} × ${mascarar(formatCurrency(op.precoUnitario), ocultar)}</div>
          </div>
          <div style="display:flex;align-items:center;gap:10px">
            <div class="nv-item-valor">${mascarar(formatCurrency(valorOperacao), ocultar)}</div>
            <button type="button" class="nv-link-muted" data-acao="excluir-operacao" data-id="${escapeHtml(op.id)}" aria-label="Excluir operação" style="color:var(--nv-negative)">✕</button>
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
      <button type="button" class="nv-gear" data-acao="editar-investimento" data-id="${escapeHtml(investimento.id)}" aria-label="Editar ativo" style="margin-left:auto">${iconGear(19)}</button>
    </div>
    <div class="nv-pilha">
      <section class="nv-cartao">
        <span class="nv-cartao-titulo">VALOR ATUAL</span>
        <div class="nv-saldo-valor">
          <span class="cifrao">R$</span>
          <span class="numero">${mascarar(formatNumero(resumo.valorAtual), ocultar)}</span>
        </div>
        <div class="nv-carteira-badge-row">
          <span class="nv-carteira-badge ${resumo.rendimentoValor < 0 ? 'nv-carteira-badge--negativo' : ''}">${formatPercent(resumo.rendimentoPercentual)}</span>
          <span class="nv-item-meta ${classeRend}">${resumo.rendimentoValor >= 0 ? '+' : '−'} ${mascarar(formatCurrency(Math.abs(resumo.rendimentoValor)), ocultar)} sobre ${mascarar(formatCurrency(resumo.valorInvestido), ocultar)}</span>
        </div>
        ${totalProventos ? `<div class="nv-saldo-sub">Proventos recebidos: ${mascarar(formatCurrency(totalProventos), ocultar)}</div>` : ''}
        ${investimento.reserva ? '<div class="nv-saldo-sub">RESERVA DE EMERGÊNCIA</div>' : ''}
      </section>

      <section class="nv-cartao nv-cartao--justo">
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
      </section>

      <section class="nv-cartao nv-cartao--justo">
        <div class="nv-cartao-topo">
          <span class="nv-cartao-titulo">OPERAÇÕES</span>
          <button type="button" class="nv-link-accent" data-acao="nova-operacao" data-id="${escapeHtml(investimento.id)}">+ NOVA OPERAÇÃO</button>
        </div>
        <div class="nv-lista">${listaOperacoes}</div>
      </section>

      <section class="nv-cartao nv-cartao--justo">
        <div class="nv-cartao-topo">
          <span class="nv-cartao-titulo">PRÓXIMOS DIVIDENDOS</span>
          <button type="button" class="nv-link-accent" data-acao="novo-provento-previsto" data-id="${escapeHtml(investimento.id)}">+ NOVO PREVISTO</button>
        </div>
        <div class="nv-lista">${
          dividendosPrevistos.length
            ? dividendosPrevistos
                .map((p) => {
                  const dataFmt = p.data.split('-').reverse().slice(0, 2).join('/');
                  return `
          <div class="nv-conta-linha" data-id="${escapeHtml(p.id)}">
            <div>
              <div class="nv-item-nome">${dataFmt}${p.descricao ? ` · ${escapeHtml(p.descricao)}` : ''}</div>
            </div>
            <div style="display:flex;align-items:center;gap:10px">
              <div class="nv-item-valor">${mascarar(formatCurrency(p.valor), ocultar)}</div>
              <button type="button" class="nv-link-muted" data-acao="excluir-provento-previsto" data-id="${escapeHtml(p.id)}" aria-label="Excluir dividendo previsto" style="color:var(--nv-negative)">✕</button>
            </div>
          </div>`;
                })
                .join('')
            : '<p class="nv-vazio">Nenhum dividendo previsto cadastrado.</p>'
        }</div>
      </section>

      <section class="nv-cartao nv-cartao--justo">
        <div class="nv-cartao-topo">
          <span class="nv-cartao-titulo">PROVENTOS</span>
          <button type="button" class="nv-link-accent" data-acao="novo-provento" data-id="${escapeHtml(investimento.id)}">+ NOVO PROVENTO</button>
        </div>
        <div class="nv-lista">${listaProventos}</div>
      </section>
    </div>
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
    renderFalhaDeTela,
    renderPerfilPergunta,
    renderPerfilCalculando,
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
