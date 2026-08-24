const {
  resumoMensal,
  parcelasEmAberto,
  parcelaNoMes,
  parcelaValor,
  totalCarteira,
  rendimento,
} = typeof require !== 'undefined' ? require('./logic.js') : window;

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const ROTULOS_TIPO_INVESTIMENTO = {
  acao: 'Ação',
  fii: 'Fundo Imobiliário',
  renda_fixa: 'Renda Fixa',
  outro: 'Outro',
};

function formatCurrency(valor) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
}

function formatPercent(valor) {
  const formatado = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valor);
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

function renderResumo(state, ano, mes) {
  const resumo = resumoMensal(state.lancamentos, ano, mes);
  const carteira = totalCarteira(state.investimentos);
  const abertas = parcelasEmAberto(state.lancamentos, ano, mes);

  const listaParcelas = abertas.length
    ? abertas
        .map(
          (p) => `
        <li>
          <strong>${escapeHtml(p.descricao)}</strong>
          <span>${formatCurrency(p.valorParcela)} — parcela ${p.numeroParcela}/${p.parcelas} (faltam ${p.restantes})</span>
        </li>`
        )
        .join('')
    : '<li class="vazio">Nenhuma parcela em aberto neste mês.</li>';

  return `
    <div class="mes-nav">
      <button data-acao="mes-anterior" aria-label="Mês anterior">‹</button>
      <h2>${MESES[mes - 1]} de ${ano}</h2>
      <button data-acao="mes-seguinte" aria-label="Próximo mês">›</button>
    </div>
    <div class="cards">
      <div class="card">
        <span class="card-label">Receitas</span>
        <span class="card-valor positivo">${formatCurrency(resumo.receitas)}</span>
      </div>
      <div class="card">
        <span class="card-label">Despesas</span>
        <span class="card-valor negativo">${formatCurrency(resumo.despesas)}</span>
      </div>
      <div class="card">
        <span class="card-label">Saldo</span>
        <span class="card-valor ${resumo.saldo >= 0 ? 'positivo' : 'negativo'}">${formatCurrency(resumo.saldo)}</span>
      </div>
      <div class="card">
        <span class="card-label">Carteira</span>
        <span class="card-valor">${formatCurrency(carteira.totalAtual)}</span>
        <span class="card-sub ${carteira.rendimentoValor >= 0 ? 'positivo' : 'negativo'}">${formatPercent(carteira.rendimentoPercentual)}</span>
      </div>
    </div>
    <h3>Parcelas em aberto</h3>
    <ul class="lista-parcelas">${listaParcelas}</ul>
  `;
}

function renderLancamentos(state, ano, mes) {
  const itens = state.lancamentos
    .filter((l) => parcelaNoMes(l, ano, mes).noMes)
    .sort((a, b) => a.data.localeCompare(b.data));

  const linhas = itens.length
    ? itens
        .map((l) => {
          const { numeroParcela } = parcelaNoMes(l, ano, mes);
          const tag = l.parcelas > 1 ? ` <span class="tag">parcela ${numeroParcela}/${l.parcelas}</span>` : '';
          const sinal = l.tipo === 'receita' ? '+' : '-';
          const classe = l.tipo === 'receita' ? 'positivo' : 'negativo';
          return `
        <li data-id="${l.id}">
          <div class="lancamento-info">
            <strong>${escapeHtml(l.descricao)}</strong>${tag}
            <small>${escapeHtml(l.categoria)} · ${l.data.split('-').reverse().join('/')}</small>
          </div>
          <div class="lancamento-valor ${classe}">${sinal} ${formatCurrency(parcelaValor(l))}</div>
          <div class="lancamento-acoes">
            <button data-acao="editar-lancamento" data-id="${l.id}" aria-label="Editar">✎</button>
            <button data-acao="excluir-lancamento" data-id="${l.id}" aria-label="Excluir">🗑</button>
          </div>
        </li>`;
        })
        .join('')
    : '<li class="vazio">Nenhum lançamento neste mês.</li>';

  return `
    <div class="mes-nav">
      <button data-acao="mes-anterior" aria-label="Mês anterior">‹</button>
      <h2>${MESES[mes - 1]} de ${ano}</h2>
      <button data-acao="mes-seguinte" aria-label="Próximo mês">›</button>
    </div>
    <ul class="lista-lancamentos">${linhas}</ul>
    <button class="fab" data-acao="novo-lancamento" aria-label="Novo lançamento">+</button>
  `;
}

function renderInvestimentos(state) {
  const itens = state.investimentos.length
    ? state.investimentos
        .map((i) => {
          const { valor, percentual } = rendimento(i.valorInvestido, i.valorAtual);
          const classe = valor >= 0 ? 'positivo' : 'negativo';
          const rotuloTipo = ROTULOS_TIPO_INVESTIMENTO[i.tipo] || i.tipo;
          return `
        <li data-id="${i.id}">
          <div class="investimento-info">
            <strong>${escapeHtml(i.nome)}</strong>
            <small>${escapeHtml(rotuloTipo)} · investido ${formatCurrency(i.valorInvestido)}</small>
          </div>
          <div class="investimento-valor ${classe}">
            ${formatCurrency(i.valorAtual)}<br>
            <small>${formatPercent(percentual)}</small>
          </div>
          <div class="lancamento-acoes">
            <button data-acao="editar-investimento" data-id="${i.id}" aria-label="Editar">✎</button>
            <button data-acao="excluir-investimento" data-id="${i.id}" aria-label="Excluir">🗑</button>
          </div>
        </li>`;
        })
        .join('')
    : '<li class="vazio">Nenhum investimento cadastrado.</li>';

  return `
    <ul class="lista-investimentos">${itens}</ul>
    <button class="fab" data-acao="novo-investimento" aria-label="Novo investimento">+</button>
  `;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { formatCurrency, formatPercent, renderResumo, renderLancamentos, renderInvestimentos };
}
