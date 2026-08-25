// Hash não-criptográfico simples pra não guardar o PIN em claro no localStorage. Não é segurança
// de verdade (é só uma trava de acesso casual, não protege contra alguém sofisticado) — serve
// apenas pra não deixar o PIN legível de bandeja no localStorage.
function hashSimples(texto) {
  let hash = 0;
  for (let i = 0; i < texto.length; i += 1) {
    hash = (hash * 31 + texto.charCodeAt(i)) >>> 0;
  }
  return hash.toString(36);
}

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

// Reprocessa o histórico de operações em ordem cronológica, mantendo quantidade e custo total
// acumulados, e registrando cada venda com o lucro realizado (preço de venda − preço médio
// naquele momento). posicaoAtivo e historicoRealizado são só recortes deste resultado.
function processarOperacoes(operacoes) {
  const ordenadas = [...(operacoes || [])].sort((a, b) => a.data.localeCompare(b.data));
  let quantidade = 0;
  let custoTotal = 0;
  const vendas = [];
  for (const op of ordenadas) {
    if (op.tipo === 'compra') {
      quantidade += op.quantidade;
      custoTotal += op.quantidade * op.precoUnitario;
    } else if (op.tipo === 'venda') {
      if (op.quantidade > quantidade) {
        throw new Error(`Venda de ${op.quantidade} unidades excede a posição atual de ${quantidade}.`);
      }
      const precoMedioNaVenda = quantidade === 0 ? 0 : custoTotal / quantidade;
      custoTotal -= op.quantidade * precoMedioNaVenda;
      quantidade -= op.quantidade;
      vendas.push({
        operacaoId: op.id,
        data: op.data,
        quantidade: op.quantidade,
        precoVenda: op.precoUnitario,
        precoMedioNaVenda,
        valorVendido: op.quantidade * op.precoUnitario,
        lucro: (op.precoUnitario - precoMedioNaVenda) * op.quantidade,
      });
    }
  }
  return { quantidade, precoMedio: quantidade === 0 ? 0 : custoTotal / quantidade, custoTotal, vendas };
}

// Calcula quantidade e preço médio ponderado de um ativo a partir do histórico de operações.
// Vendas reduzem a quantidade mas não alteram o preço médio (custo proporcional é retirado).
function posicaoAtivo(operacoes) {
  const { quantidade, precoMedio, custoTotal } = processarOperacoes(operacoes);
  return { quantidade, precoMedio, custoTotal };
}

// Lista o lucro realizado de cada venda (preço de venda − preço médio no momento da venda),
// na ordem cronológica das operações — base pro cálculo de imposto estimado.
function historicoRealizado(operacoes) {
  return processarOperacoes(operacoes).vendas;
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

// Soma o valor atual da carteira agrupado por tipo de ativo (ação/fii/renda_fixa/outro),
// do maior para o menor.
function composicaoPorTipo(investimentos) {
  const composicao = [];
  for (const inv of investimentos) {
    const { valorAtual } = resumoInvestimento(inv);
    const existente = composicao.find((c) => c.tipo === inv.tipo);
    if (existente) existente.valor += valorAtual;
    else composicao.push({ tipo: inv.tipo, valor: valorAtual });
  }
  return composicao.sort((a, b) => b.valor - a.valor);
}

// Compara a composição atual da carteira com a alocação-alvo (% por tipo) e devolve, pra cada
// tipo com meta definida, o quanto falta em R$ pra chegar nela — do maior déficit pro menor.
// Um valor de "diferenca" negativo indica que o tipo já está acima da meta.
function sugestaoAporte(investimentos, alocacaoAlvo) {
  if (!alocacaoAlvo) return [];
  const composicao = composicaoPorTipo(investimentos);
  const totalAtual = composicao.reduce((s, c) => s + c.valor, 0);
  return Object.keys(alocacaoAlvo)
    .map((tipo) => {
      const atual = (composicao.find((c) => c.tipo === tipo) || { valor: 0 }).valor;
      const ideal = (alocacaoAlvo[tipo] / 100) * totalAtual;
      return { tipo, atual, ideal, diferenca: ideal - atual };
    })
    .sort((a, b) => b.diferenca - a.diferenca);
}

function totalProventos(proventos) {
  return (proventos || []).reduce((s, p) => s + p.valor, 0);
}

// Estimativa de imposto de renda sobre ganho de capital em ações e FIIs, mês a mês.
// Ações: isentas se o total vendido no mês (todos os ativos do tipo, somados) não passar de
// R$20.000; senão, 15% sobre o lucro líquido do mês. FIIs: sempre 20% sobre o lucro líquido do
// mês, sem isenção por valor vendido. Day-trade e renda fixa/outro ficam fora (regras diferentes).
// É uma estimativa de apoio à decisão — não substitui cálculo de contador pra fins de DARF.
const REGRAS_IMPOSTO_CARTEIRA = {
  acao: { aliquota: 0.15, limiteIsencaoVendas: 20000 },
  fii: { aliquota: 0.2, limiteIsencaoVendas: 0 },
};

function impostoEstimadoMes(investimentos, ano, mes) {
  const porTipo = {};
  for (const inv of investimentos) {
    const regra = REGRAS_IMPOSTO_CARTEIRA[inv.tipo];
    if (!regra) continue;
    const investimentoMigrado = migrarInvestimentoLegado(inv);
    const vendasDoMes = historicoRealizado(investimentoMigrado.operacoes).filter((v) => {
      const [anoVenda, mesVenda] = v.data.split('-').map(Number);
      return anoVenda === ano && mesVenda === mes;
    });
    if (!vendasDoMes.length) continue;
    if (!porTipo[inv.tipo]) porTipo[inv.tipo] = { tipo: inv.tipo, totalVendido: 0, lucroLiquido: 0 };
    for (const venda of vendasDoMes) {
      porTipo[inv.tipo].totalVendido += venda.valorVendido;
      porTipo[inv.tipo].lucroLiquido += venda.lucro;
    }
  }
  return Object.values(porTipo).map((item) => {
    const regra = REGRAS_IMPOSTO_CARTEIRA[item.tipo];
    const isento = regra.limiteIsencaoVendas > 0 && item.totalVendido <= regra.limiteIsencaoVendas;
    const lucroTributavel = isento ? 0 : Math.max(0, item.lucroLiquido);
    return { ...item, isento, lucroTributavel, aliquota: regra.aliquota, impostoEstimado: lucroTributavel * regra.aliquota };
  });
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
    alocacaoAlvo: null,
  };
}

function applyAction(state, action) {
  const lancamentos = state.lancamentos ? state.lancamentos.slice() : [];
  const investimentos = state.investimentos ? state.investimentos.slice() : [];
  const contas = state.contas ? state.contas.slice() : [];
  const metas = state.metas ? state.metas.slice() : [];
  const tema = state.tema || 'escuro';
  const ocultarValores = state.ocultarValores || false;
  const alocacaoAlvo = state.alocacaoAlvo || null;
  const base = { lancamentos, investimentos, contas, metas, tema, ocultarValores, alocacaoAlvo };

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
    case 'setAlocacaoAlvo':
      return { ...base, alocacaoAlvo: action.alocacaoAlvo };
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
    composicaoPorTipo,
    sugestaoAporte,
    totalProventos,
    historicoRealizado,
    impostoEstimadoMes,
    hashSimples,
  };
}
