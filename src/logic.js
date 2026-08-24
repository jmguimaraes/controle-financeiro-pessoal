function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function parcelaValor(lancamento) {
  const parcelas = lancamento.parcelas || 1;
  return lancamento.valorTotal / parcelas;
}

function parcelaNoMes(lancamento, ano, mes) {
  const [anoIni, mesIni] = lancamento.data.split('-').map(Number);
  const inicioIndex = anoIni * 12 + (mesIni - 1);
  const alvoIndex = ano * 12 + (mes - 1);
  const diff = alvoIndex - inicioIndex;
  const parcelas = lancamento.parcelas || 1;
  if (diff < 0 || diff >= parcelas) {
    return { noMes: false, numeroParcela: null };
  }
  return { noMes: true, numeroParcela: diff + 1 };
}

function resumoMensal(lancamentos, ano, mes) {
  let receitas = 0;
  let despesas = 0;
  for (const l of lancamentos) {
    const { noMes } = parcelaNoMes(l, ano, mes);
    if (!noMes) continue;
    const valor = parcelaValor(l);
    if (l.tipo === 'receita') receitas += valor;
    else if (l.tipo === 'despesa') despesas += valor;
  }
  return { receitas, despesas, saldo: receitas - despesas };
}

function parcelasEmAberto(lancamentos, ano, mes) {
  const resultado = [];
  for (const l of lancamentos) {
    const parcelas = l.parcelas || 1;
    if (parcelas <= 1) continue;
    const { noMes, numeroParcela } = parcelaNoMes(l, ano, mes);
    if (!noMes) continue;
    resultado.push({
      id: l.id,
      descricao: l.descricao,
      valorParcela: parcelaValor(l),
      numeroParcela,
      parcelas,
      restantes: parcelas - numeroParcela,
    });
  }
  return resultado;
}

function rendimento(investido, atual) {
  const valor = atual - investido;
  const percentual = investido === 0 ? 0 : (valor / investido) * 100;
  return { valor, percentual };
}

function totalCarteira(investimentos) {
  const totalInvestido = investimentos.reduce((s, i) => s + i.valorInvestido, 0);
  const totalAtual = investimentos.reduce((s, i) => s + i.valorAtual, 0);
  const { valor, percentual } = rendimento(totalInvestido, totalAtual);
  return { totalInvestido, totalAtual, rendimentoValor: valor, rendimentoPercentual: percentual };
}

function applyAction(state, action) {
  const lancamentos = state.lancamentos ? state.lancamentos.slice() : [];
  const investimentos = state.investimentos ? state.investimentos.slice() : [];

  switch (action.type) {
    case 'addLancamento':
      return { lancamentos: [...lancamentos, action.lancamento], investimentos };
    case 'editLancamento':
      return {
        lancamentos: lancamentos.map((l) => (l.id === action.id ? { ...l, ...action.changes } : l)),
        investimentos,
      };
    case 'deleteLancamento':
      return { lancamentos: lancamentos.filter((l) => l.id !== action.id), investimentos };
    case 'addInvestimento':
      return { lancamentos, investimentos: [...investimentos, action.investimento] };
    case 'editInvestimento':
      return {
        lancamentos,
        investimentos: investimentos.map((i) => (i.id === action.id ? { ...i, ...action.changes } : i)),
      };
    case 'deleteInvestimento':
      return { lancamentos, investimentos: investimentos.filter((i) => i.id !== action.id) };
    default:
      throw new Error(`Ação desconhecida: ${action.type}`);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { uid, parcelaValor, parcelaNoMes, resumoMensal, parcelasEmAberto, rendimento, totalCarteira, applyAction };
}
