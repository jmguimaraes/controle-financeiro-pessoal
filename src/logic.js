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

// Calcula quantidade e preço médio ponderado de um ativo a partir do histórico de operações.
// Vendas reduzem a quantidade mas não alteram o preço médio (custo proporcional é retirado).
function posicaoAtivo(operacoes) {
  const ordenadas = [...(operacoes || [])].sort((a, b) => a.data.localeCompare(b.data));
  let quantidade = 0;
  let custoTotal = 0;
  for (const op of ordenadas) {
    if (op.tipo === 'compra') {
      quantidade += op.quantidade;
      custoTotal += op.quantidade * op.precoUnitario;
    } else if (op.tipo === 'venda') {
      if (op.quantidade > quantidade) {
        throw new Error(`Venda de ${op.quantidade} unidades excede a posição atual de ${quantidade}.`);
      }
      const precoMedioAtual = quantidade === 0 ? 0 : custoTotal / quantidade;
      custoTotal -= op.quantidade * precoMedioAtual;
      quantidade -= op.quantidade;
    }
  }
  return { quantidade, precoMedio: quantidade === 0 ? 0 : custoTotal / quantidade, custoTotal };
}

// Converte um investimento no formato antigo (valorInvestido/valorAtual fixos) numa 1ª operação
// de compra sintética com quantidade=1, preservando o dado sem exigir migração manual do usuário.
function migrarInvestimentoLegado(investimento) {
  if (investimento.operacoes) return investimento;
  const { valorInvestido, valorAtual, ...resto } = investimento;
  const data = investimento.atualizadoEm || new Date().toISOString().slice(0, 10);
  return {
    ...resto,
    precoAtual: valorAtual || 0,
    operacoes: [{ id: uid(), tipo: 'compra', data, quantidade: 1, precoUnitario: valorInvestido || 0 }],
  };
}

function resumoInvestimento(investimentoBruto) {
  const investimento = migrarInvestimentoLegado(investimentoBruto);
  const { quantidade, precoMedio } = posicaoAtivo(investimento.operacoes);
  const precoAtual = investimento.precoAtual || 0;
  const valorInvestido = quantidade * precoMedio;
  const valorAtual = quantidade * precoAtual;
  const { valor, percentual } = rendimento(valorInvestido, valorAtual);
  return { quantidade, precoMedio, precoAtual, valorInvestido, valorAtual, rendimentoValor: valor, rendimentoPercentual: percentual };
}

function totalCarteira(investimentos) {
  const resumos = investimentos.map(resumoInvestimento);
  const totalInvestido = resumos.reduce((s, r) => s + r.valorInvestido, 0);
  const totalAtual = resumos.reduce((s, r) => s + r.valorAtual, 0);
  const { valor, percentual } = rendimento(totalInvestido, totalAtual);
  return { totalInvestido, totalAtual, rendimentoValor: valor, rendimentoPercentual: percentual };
}

function indiceMes(ano, mes) {
  return ano * 12 + (mes - 1);
}

function mesPorIndice(indice) {
  return { ano: Math.floor(indice / 12), mes: (((indice % 12) + 12) % 12) + 1 };
}

function filtrarLancamentos(lancamentos, ano, mes, opcoes = {}) {
  const { busca = '', filtro = 'todos', contaId = null } = opcoes;
  const buscaNormalizada = busca.trim().toLowerCase();

  return lancamentos
    .map((l) => ({ lancamento: l, parcela: parcelaNoMes(l, ano, mes) }))
    .filter((item) => item.parcela.noMes)
    .filter((item) => {
      if (filtro === 'receitas') return item.lancamento.tipo === 'receita';
      if (filtro === 'despesas') return item.lancamento.tipo === 'despesa';
      if (filtro === 'parcelados') return (item.lancamento.parcelas || 1) > 1;
      return true;
    })
    .filter((item) => !contaId || item.lancamento.contaId === contaId)
    .filter((item) => {
      if (!buscaNormalizada) return true;
      const alvo = `${item.lancamento.descricao} ${item.lancamento.categoria}`.toLowerCase();
      return alvo.includes(buscaNormalizada);
    })
    .map((item) => ({ ...item.lancamento, numeroParcela: item.parcela.numeroParcela }))
    .sort((a, b) => b.data.localeCompare(a.data));
}

function totalFiltrado(itensFiltrados) {
  return itensFiltrados.reduce(
    (soma, l) => soma + (l.tipo === 'receita' ? parcelaValor(l) : -parcelaValor(l)),
    0
  );
}

function resumoUltimosMeses(lancamentos, ano, mes, quantidade = 7) {
  const alvo = indiceMes(ano, mes);
  const resultado = [];
  for (let i = quantidade - 1; i >= 0; i -= 1) {
    const { ano: anoAlvo, mes: mesAlvo } = mesPorIndice(alvo - i);
    const { saldo } = resumoMensal(lancamentos, anoAlvo, mesAlvo);
    resultado.push({ ano: anoAlvo, mes: mesAlvo, saldo });
  }
  return resultado;
}

function gastosPorCategoria(lancamentos, ano, mes) {
  const totais = new Map();
  for (const l of lancamentos) {
    if (l.tipo !== 'despesa') continue;
    const { noMes } = parcelaNoMes(l, ano, mes);
    if (!noMes) continue;
    totais.set(l.categoria, (totais.get(l.categoria) || 0) + parcelaValor(l));
  }
  return [...totais.entries()]
    .map(([categoria, valor]) => ({ categoria, valor }))
    .sort((a, b) => b.valor - a.valor);
}

function gastoCategoriaUltimosMeses(lancamentos, categoria, ano, mes, quantidade = 6) {
  const alvo = indiceMes(ano, mes);
  const resultado = [];
  for (let i = quantidade - 1; i >= 0; i -= 1) {
    const { ano: anoAlvo, mes: mesAlvo } = mesPorIndice(alvo - i);
    const item = gastosPorCategoria(lancamentos, anoAlvo, mesAlvo).find((c) => c.categoria === categoria);
    resultado.push({ ano: anoAlvo, mes: mesAlvo, valor: item ? item.valor : 0 });
  }
  return resultado;
}

function statusMeta(gastoAtual, limite) {
  if (!limite || limite <= 0) return { percentual: 0, excedeu: false, excedente: 0 };
  const percentual = (gastoAtual / limite) * 100;
  const excedeu = gastoAtual > limite;
  return { percentual, excedeu, excedente: excedeu ? gastoAtual - limite : 0 };
}

function estadoInicial() {
  return {
    lancamentos: [],
    investimentos: [],
    contas: [],
    metas: [],
    tema: 'escuro',
    ocultarValores: false,
  };
}

function applyAction(state, action) {
  const lancamentos = state.lancamentos ? state.lancamentos.slice() : [];
  const investimentos = state.investimentos ? state.investimentos.slice() : [];
  const contas = state.contas ? state.contas.slice() : [];
  const metas = state.metas ? state.metas.slice() : [];
  const tema = state.tema || 'escuro';
  const ocultarValores = state.ocultarValores || false;
  const base = { lancamentos, investimentos, contas, metas, tema, ocultarValores };

  switch (action.type) {
    case 'addLancamento':
      return { ...base, lancamentos: [...lancamentos, action.lancamento] };
    case 'editLancamento':
      return {
        ...base,
        lancamentos: lancamentos.map((l) => (l.id === action.id ? { ...l, ...action.changes } : l)),
      };
    case 'deleteLancamento':
      return { ...base, lancamentos: lancamentos.filter((l) => l.id !== action.id) };
    case 'addInvestimento':
      return { ...base, investimentos: [...investimentos, action.investimento] };
    case 'editInvestimento':
      return {
        ...base,
        investimentos: investimentos.map((i) => (i.id === action.id ? { ...i, ...action.changes } : i)),
      };
    case 'deleteInvestimento':
      return { ...base, investimentos: investimentos.filter((i) => i.id !== action.id) };
    case 'addConta':
      return { ...base, contas: [...contas, action.conta] };
    case 'editConta':
      return { ...base, contas: contas.map((c) => (c.id === action.id ? { ...c, ...action.changes } : c)) };
    case 'deleteConta':
      return { ...base, contas: contas.filter((c) => c.id !== action.id) };
    case 'addMeta':
      return { ...base, metas: [...metas, action.meta] };
    case 'editMeta':
      return { ...base, metas: metas.map((m) => (m.id === action.id ? { ...m, ...action.changes } : m)) };
    case 'deleteMeta':
      return { ...base, metas: metas.filter((m) => m.id !== action.id) };
    case 'setTema':
      return { ...base, tema: action.tema };
    case 'setOcultarValores':
      return { ...base, ocultarValores: !!action.valor };
    default:
      throw new Error(`Ação desconhecida: ${action.type}`);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
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
  };
}
