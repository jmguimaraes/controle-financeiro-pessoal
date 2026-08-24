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

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { formatCurrency, formatPercent, renderResumo };
}
