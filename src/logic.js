// Sugestões de nome/ticker por tipo de ativo — lista curada e ampliada, mas nunca vai ser
// exaustiva nem é uma fonte de dados de mercado (não é atualizada nem vem de API nenhuma, e não
// tem preço nenhum aqui). Serve só de ponto de partida no autocomplete; o campo continua
// aceitando qualquer texto digitado livremente, esteja ou não nesta lista. Só "Outro" fica sem
// lista de propósito — é o catch-all genérico.
const ATIVOS_SUGERIDOS = {
  acao: [
    'PETR4', 'PETR3', 'VALE3', 'ITUB4', 'ITUB3', 'BBDC4', 'BBDC3', 'ABEV3', 'BBAS3', 'WEGE3',
    'ITSA4', 'B3SA3', 'RENT3', 'SUZB3', 'JBSS3', 'RADL3', 'PRIO3', 'EQTL3', 'ELET3', 'ELET6',
    'GGBR4', 'CSNA3', 'USIM5', 'CPLE6', 'CMIG4', 'SBSP3', 'VIVT3', 'TIMS3', 'TOTS3', 'LREN3',
    'RAIL3', 'CCRO3', 'EMBR3', 'BRFS3', 'MRFG3', 'KLBN11', 'HAPV3', 'NTCO3', 'CYRE3', 'MULT3',
    'CSAN3', 'UGPA3', 'CRFB3', 'AZUL4', 'GOLL4', 'CVCB3', 'YDUQ3', 'COGN3', 'MRVE3', 'HYPE3',
    'PETZ3', 'ARZZ3',
  ],
  fii: [
    'HGLG11', 'KNRI11', 'MXRF11', 'XPML11', 'VISC11', 'BCFF11', 'HGRE11', 'VILG11', 'BTLG11', 'RECT11',
    'XPLG11', 'HGBS11', 'IRDM11', 'KNCR11', 'RBRF11', 'VGIP11', 'HFOF11', 'BRCO11', 'GGRC11', 'JSRE11',
    'ALZR11', 'VINO11', 'HSML11', 'RECR11', 'KNIP11', 'PVBI11', 'HGRU11', 'RBRP11', 'HCTR11',
  ],
  criptomoeda: [
    'BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA', 'DOGE', 'AVAX', 'DOT', 'MATIC',
    'LINK', 'LTC', 'TRX', 'ATOM', 'UNI', 'XLM', 'ETC', 'FIL', 'APT', 'ARB',
    'OP', 'NEAR', 'ICP', 'SHIB', 'TON',
  ],
  stock: [
    'AAPL', 'MSFT', 'GOOGL', 'GOOG', 'AMZN', 'NVDA', 'META', 'TSLA', 'BRK.B', 'JPM',
    'V', 'MA', 'UNH', 'HD', 'PG', 'JNJ', 'XOM', 'WMT', 'DIS', 'NFLX',
    'KO', 'PEP', 'ADBE', 'CRM', 'INTC', 'AMD', 'CSCO', 'ORCL', 'IBM', 'NKE',
  ],
  reit: ['O', 'PLD', 'AMT', 'SPG', 'PSA', 'EQIX', 'WELL', 'DLR', 'AVB', 'EQR', 'VTR', 'ARE', 'EXR', 'CCI'],
  bdr: [
    'AAPL34', 'GOGL34', 'AMZO34', 'MSFT34', 'TSLA34', 'NVDC34', 'META34', 'DISB34',
    'NFLX34', 'JPMC34', 'COCA34', 'WALM34', 'PGCO34', 'JNJB34',
  ],
  etf: ['BOVA11', 'IVVB11', 'SMAL11', 'DIVO11', 'BOVV11', 'XFIX11', 'BBSD11', 'ECOO11', 'GOLD11', 'HASH11', 'ISUS11'],
  etf_internacional: ['SPY', 'QQQ', 'VOO', 'VTI', 'IWM', 'DIA', 'EFA', 'EEM', 'GLD', 'AGG', 'VEA', 'VWO'],
  tesouro_direto: ['Tesouro Selic', 'Tesouro IPCA+', 'Tesouro Prefixado', 'Tesouro IPCA+ com Juros Semestrais', 'Tesouro Prefixado com Juros Semestrais'],
  // Fundo de investimento não tem "ticker" (não é negociado em bolsa como ação/FII) — sugere as
  // categorias padronizadas pela CVM, que são estáveis e não ficam desatualizadas como um nome
  // de produto específico ficaria.
  fundo_investimento: ['Fundo Multimercado', 'Fundo de Ações', 'Fundo Cambial', 'Fundo de Renda Fixa', 'Fundo Imobiliário Não Listado', 'Fundo de Previdência (PGBL)', 'Fundo de Previdência (VGBL)'],
  // Renda fixa "bancária" também não tem ticker — sugere os tipos de instrumento mais comuns.
  renda_fixa: ['CDB', 'LCI', 'LCA', 'CRI', 'CRA', 'Debênture', 'Poupança', 'COE'],
};

function listaSugeridaPorTipo(tipo) {
  return ATIVOS_SUGERIDOS[tipo] || [];
}

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

// --- Calculadoras ---

// Avança o saldo em um mês: primeiro aplica a taxa sobre o saldo já existente, depois soma o
// aporte do mês (aporte entra "depois de render o mês", não antes). jurosCompostos e
// mesesParaAtingirMeta reusam este passo pra ficarem sempre consistentes entre si; a fórmula
// fechada de aporteNecessarioParaMeta foi deduzida a partir da mesma ordem (juros → aporte).
function passoMesJurosCompostos(saldo, taxaMensal, aporteMensal) {
  return saldo + saldo * taxaMensal + aporteMensal;
}

function jurosCompostos({ capitalInicial = 0, aporteMensal = 0, taxaMensal = 0, meses = 0 }) {
  let saldo = capitalInicial;
  for (let i = 0; i < meses; i += 1) {
    saldo = passoMesJurosCompostos(saldo, taxaMensal, aporteMensal);
  }
  const totalInvestido = capitalInicial + aporteMensal * meses;
  return { montanteFinal: saldo, totalInvestido, totalJuros: saldo - totalInvestido };
}

function jurosSimples({ capitalInicial = 0, taxaMensal = 0, meses = 0 }) {
  const montanteFinal = capitalInicial * (1 + taxaMensal * meses);
  return { montanteFinal, jurosTotal: montanteFinal - capitalInicial };
}

function percentualDeValor(percentual, valor) {
  return (percentual / 100) * valor;
}

function valorEQuePercentualDoTotal(valor, total) {
  if (total === 0) return 0;
  return (valor / total) * 100;
}

// Percentual positivo aumenta o valor, negativo diminui — é a mesma conta nos dois casos.
function aplicarVariacaoPercentual(valor, percentual) {
  return valor * (1 + percentual / 100);
}

// Teto de segurança pra calculadora "primeiro milhão": sem aporte e sem taxa (ou com valor-alvo
// já inatingível nesse horizonte), o saldo nunca cresce — sem este limite o laço giraria pra
// sempre. 1200 meses = 100 anos é bem além de qualquer plano de vida realista.
const LIMITE_MESES_PRIMEIRO_MILHAO = 1200;

// Quantos meses faltam, com um aporte mensal fixo, pra sair do capital inicial e chegar no
// valor-alvo. Usa o mesmo passo mês a mês de jurosCompostos, então os dois cálculos nunca
// divergem entre si.
function mesesParaAtingirMeta({ capitalInicial = 0, aporteMensal = 0, taxaMensal = 0, valorAlvo }) {
  let saldo = capitalInicial;
  if (saldo >= valorAlvo) return { meses: 0, anos: 0 };
  let meses = 0;
  while (saldo < valorAlvo) {
    saldo = passoMesJurosCompostos(saldo, taxaMensal, aporteMensal);
    meses += 1;
    if (meses >= LIMITE_MESES_PRIMEIRO_MILHAO) return { meses: null, anos: null };
  }
  return { meses, anos: meses / 12 };
}

// Qual aporte mensal fixo, ao longo de um prazo definido, leva do capital inicial ao valor-alvo.
// Fórmula fechada da anuidade ordinária (contribuição após o juro do mês), coerente com a mesma
// ordem usada em passoMesJurosCompostos — por isso os dois cálculos se verificam um ao outro.
function aporteNecessarioParaMeta({ capitalInicial = 0, meses, taxaMensal = 0, valorAlvo }) {
  if (!meses || meses <= 0) return { aporteMensal: null };
  if (taxaMensal === 0) {
    return { aporteMensal: Math.max(0, (valorAlvo - capitalInicial) / meses) };
  }
  const capitalFuturo = capitalInicial * Math.pow(1 + taxaMensal, meses);
  const fatorAnuidade = (Math.pow(1 + taxaMensal, meses) - 1) / taxaMensal;
  return { aporteMensal: Math.max(0, (valorAlvo - capitalFuturo) / fatorAnuidade) };
}

// Junta os dividendos previstos (cadastrados manualmente pelo usuário, não vêm de nenhuma fonte
// de mercado — ver restrição de plataforma) de todos os ativos numa única agenda, ignorando datas
// já passadas em relação a dataReferencia e ordenando do mais próximo pro mais distante.
function proximosDividendosPrevistos(investimentos, dataReferencia) {
  const hoje = dataReferencia || new Date().toISOString().slice(0, 10);
  const todos = [];
  for (const inv of investimentos) {
    for (const p of inv.proventosPrevistos || []) {
      todos.push({ investimentoId: inv.id, nome: inv.nome, ...p });
    }
  }
  return todos.filter((p) => p.data >= hoje).sort((a, b) => a.data.localeCompare(b.data));
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
    listaSugeridaPorTipo,
    jurosCompostos,
    jurosSimples,
    percentualDeValor,
    valorEQuePercentualDoTotal,
    aplicarVariacaoPercentual,
    mesesParaAtingirMeta,
    aporteNecessarioParaMeta,
    proximosDividendosPrevistos,
  };
}
