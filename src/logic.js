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

// --- Segredo do PIN -----------------------------------------------------------------------------
// hashSimples guardava o PIN de um jeito que devolvia o número digitado em 30ms: 32 bits, sem sal
// e sem custo nenhum pra calcular. Como não colide para 4 nem 6 dígitos, o valor recuperado é
// exatamente o PIN da pessoa — e PIN é o tipo de segredo que se repete no banco e no celular.
//
// O que muda: PBKDF2-SHA256 com sal aleatório por aparelho e iterações suficientes pra que testar
// os 10^6 PINs deixe de ser instantâneo. O que NÃO muda: seis dígitos continuam um espaço pequeno,
// então isto encarece a recuperação, não a impede. E o PIN segue sem cifrar nada — quem abre o
// armazenamento do navegador lê os dados sem passar por aqui.
//
// As iterações vão gravadas no registro: dá pra subir o número depois sem invalidar quem já tem
// PIN definido.
const PIN_ITERACOES = 600000;
const PIN_VERSAO = 2;

function cryptoDisponivel() {
  const c = typeof globalThis !== 'undefined' ? globalThis.crypto : null;
  return !!(c && c.subtle && c.getRandomValues);
}

function bytesParaBase64(bytes) {
  let binario = '';
  for (const b of bytes) binario += String.fromCharCode(b);
  return btoa(binario);
}

function base64ParaBytes(texto) {
  const binario = atob(texto);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i += 1) bytes[i] = binario.charCodeAt(i);
  return bytes;
}

async function derivarPin(pin, sal, iteracoes) {
  const material = await globalThis.crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(String(pin)),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await globalThis.crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: sal, iterations: iteracoes, hash: 'SHA-256' },
    material,
    256
  );
  return new Uint8Array(bits);
}

// Sem WebCrypto não dá pra derivar. Cair no formato antigo é pior do que impedir de definir PIN?
// Não: o PIN é uma tranca de conveniência declarada como tal na própria tela, e recusar a definição
// deixaria a pessoa sem tranca nenhuma. Guarda no formato antigo e segue.
async function criarSegredoPin(pin) {
  if (!cryptoDisponivel()) return hashSimples(String(pin));
  const sal = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const derivado = await derivarPin(pin, sal, PIN_ITERACOES);
  return JSON.stringify({
    v: PIN_VERSAO,
    iter: PIN_ITERACOES,
    sal: bytesParaBase64(sal),
    hash: bytesParaBase64(derivado),
  });
}

function lerSegredoPin(guardado) {
  if (typeof guardado !== 'string' || guardado[0] !== '{') return null;
  try {
    const r = JSON.parse(guardado);
    if (r && r.v === PIN_VERSAO && r.sal && r.hash && r.iter > 0) return r;
    return null;
  } catch (erro) {
    return null;
  }
}

function iguaisEmTempoConstante(a, b) {
  if (a.length !== b.length) return false;
  let diferenca = 0;
  for (let i = 0; i < a.length; i += 1) diferenca |= a[i] ^ b[i];
  return diferenca === 0;
}

// Devolve { ok, precisaMigrar, indisponivel }. `precisaMigrar` marca o PIN que ainda está no
// formato antigo e acabou de ser conferido: quem chama regrava no formato novo, então a troca
// acontece sozinha no primeiro acesso, sem pedir nada à pessoa.
async function conferirPin(pin, guardado) {
  const registro = lerSegredoPin(guardado);
  if (!registro) {
    const ok = hashSimples(String(pin)) === guardado;
    return { ok, precisaMigrar: ok, indisponivel: false };
  }
  if (!cryptoDisponivel()) return { ok: false, precisaMigrar: false, indisponivel: true };
  const derivado = await derivarPin(pin, base64ParaBytes(registro.sal), registro.iter);
  return {
    ok: iguaisEmTempoConstante(derivado, base64ParaBytes(registro.hash)),
    precisaMigrar: false,
    indisponivel: false,
  };
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

// Quem gastou: campo de texto livre no lançamento, sem cadastro de pessoas. A lista de nomes é
// derivada do que já foi digitado, e grafias que só diferem em caixa/acento ("João", "joao") contam
// como a mesma pessoa — senão o filtro encheria de duplicata a cada digitação diferente.
function pessoasUsadas(lancamentos) {
  const vistas = new Map();
  for (const l of lancamentos || []) {
    const nome = String((l && l.pessoa) || '').trim();
    if (!nome) continue;
    const chave = normalizarTexto(nome);
    if (!vistas.has(chave)) vistas.set(chave, nome);
  }
  return [...vistas.values()].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

function filtrarLancamentos(lancamentos, ano, mes, opcoes = {}) {
  const { busca = '', filtro = 'todos', contaId = null, pessoa = null } = opcoes;
  const buscaNormalizada = busca.trim().toLowerCase();
  const pessoaNormalizada = pessoa ? normalizarTexto(pessoa).trim() : '';

  return lancamentos
    .map((l) => ({ lancamento: l, parcela: parcelaNoMes(l, ano, mes) }))
    .filter((item) => item.parcela.noMes)
    .filter((item) => {
      if (filtro === 'receitas') return item.lancamento.tipo === 'receita';
      if (filtro === 'despesas') return item.lancamento.tipo === 'despesa';
      if (filtro === 'transferencias') return item.lancamento.tipo === 'transferencia';
      if (filtro === 'parcelados') return (item.lancamento.parcelas || 1) > 1;
      return true;
    })
    .filter((item) => !contaId || item.lancamento.contaId === contaId)
    .filter((item) => {
      if (!pessoaNormalizada) return true;
      return normalizarTexto(item.lancamento.pessoa || '').trim() === pessoaNormalizada;
    })
    .filter((item) => {
      if (!buscaNormalizada) return true;
      const alvo = `${item.lancamento.descricao} ${item.lancamento.categoria} ${item.lancamento.subcategoria || ''}`.toLowerCase();
      return alvo.includes(buscaNormalizada);
    })
    .map((item) => ({ ...item.lancamento, numeroParcela: item.parcela.numeroParcela }))
    .sort((a, b) => b.data.localeCompare(a.data));
}

function totalFiltrado(itensFiltrados) {
  return itensFiltrados.reduce(
    // Transferência entre contas próprias não é ganho nem perda: se entrasse aqui como saída,
    // o total da lista contradiria o saldo do mês, que já a ignora.
    (soma, l) => {
      if (l.tipo === 'transferencia') return soma;
      return soma + (l.tipo === 'receita' ? parcelaValor(l) : -parcelaValor(l));
    },
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

// Segundo nível de categoria. Assim como "quem gastou", a subcategoria é texto livre no próprio
// lançamento e a lista sai do que já foi digitado — não há cadastro de subcategorias a manter, e
// lançamento antigo simplesmente fica sem uma. São dois níveis de propósito: com três, a tela vira
// planilha, e nesse jogo a planilha ganha.
function subcategoriasUsadas(lancamentos, categoria) {
  const vistas = new Map();
  for (const l of lancamentos || []) {
    if (!l || l.categoria !== categoria) continue;
    const nome = String(l.subcategoria || '').trim();
    if (!nome) continue;
    const chave = normalizarTexto(nome);
    if (!vistas.has(chave)) vistas.set(chave, nome);
  }
  return [...vistas.values()].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

// O que não tem subcategoria cai sob a chave vazia, em vez de sumir: senão a soma das
// subcategorias não bateria com o total da categoria, e a tela mentiria por omissão.
function gastosPorSubcategoria(lancamentos, categoria, ano, mes) {
  const totais = new Map();
  for (const l of lancamentos || []) {
    if (l.tipo !== 'despesa' || l.categoria !== categoria) continue;
    const { noMes } = parcelaNoMes(l, ano, mes);
    if (!noMes) continue;
    const chave = String(l.subcategoria || '').trim();
    totais.set(chave, (totais.get(chave) || 0) + parcelaValor(l));
  }
  return [...totais.entries()]
    .map(([subcategoria, valor]) => ({ subcategoria, valor }))
    .sort((a, b) => b.valor - a.valor);
}

// Quanto uma meta está medindo neste mês: a categoria inteira, ou só uma subcategoria dela quando
// a meta define uma. Fonte única pra tela de Metas, o detalhe da categoria e os alertas — se cada
// uma calculasse por conta própria, uma acabaria discordando das outras.
function gastoDaMeta(lancamentos, meta, ano, mes) {
  if (!meta) return 0;
  const alvo = String(meta.subcategoria || '').trim();
  if (!alvo) {
    const item = gastosPorCategoria(lancamentos, ano, mes).find((c) => c.categoria === meta.categoria);
    return item ? item.valor : 0;
  }
  const alvoNormalizado = normalizarTexto(alvo);
  return gastosPorSubcategoria(lancamentos, meta.categoria, ano, mes)
    .filter((s) => normalizarTexto(s.subcategoria) === alvoNormalizado)
    .reduce((soma, s) => soma + s.valor, 0);
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

// --- Dívidas e patrimônio líquido ---

// A carteira sozinha conta só metade da história: quem tem R$ 20 mil investidos e R$ 180 mil de
// financiamento não tem R$ 20 mil. Patrimônio líquido é o número que fecha a conta, e pra quem
// tem financiamento imobiliário costuma ser O número.
function totalDividas(dividas) {
  return (dividas || []).reduce((soma, d) => soma + (d.saldoDevedor || 0), 0);
}

function patrimonioLiquido(investimentos, dividas) {
  const ativos = totalCarteira(investimentos || []).totalAtual;
  const devido = totalDividas(dividas);
  const liquido = ativos - devido;
  return { ativos, dividas: devido, liquido, negativo: liquido < 0 };
}

// Quanto da renda do mês já está comprometido com parcela de dívida. É o indicador que mostra
// aperto antes de ele virar problema — bem mais útil no dia a dia que o saldo devedor total.
function comprometimentoMensal(dividas, rendaMensal) {
  const parcelaTotal = (dividas || []).reduce((soma, d) => soma + (d.valorParcela || 0), 0);
  const percentualDaRenda = rendaMensal > 0 ? (parcelaTotal / rendaMensal) * 100 : 0;
  return { parcelaTotal, percentualDaRenda };
}

// --- Alertas por regra ---
// Educação financeira sobre os dados do próprio usuário: nenhuma regra aqui recomenda ativo,
// corretora ou aplicação — isso seria consultoria de valores mobiliários, atividade regulada pela
// CVM. O que estes alertas fazem é ler o que já está registrado e apontar padrão de risco de
// comportamento (meta estourada, renda comprometida, reserva curta), que é livre.

// Faixas de referência da educação financeira brasileira (BC, Serasa), não invenção do app:
// até 30% da renda em parcela de dívida é o teto usualmente recomendado, e a reserva de
// emergência costuma ser recomendada em 3 a 6 meses de despesa.
const LIMITE_COMPROMETIMENTO_ATENCAO = 30;
const LIMITE_COMPROMETIMENTO_CRITICO = 50;
const MESES_RESERVA_RECOMENDADO = 3;
const MESES_RESERVA_CRITICO = 1;
const PERCENTUAL_META_ATENCAO = 80;

// Só entra o que o usuário marcou explicitamente como reserva. O app não tem como saber sozinho
// se um "renda fixa" é resgatável hoje ou está travado por três anos, e tratar os dois como
// reserva daria um alerta tranquilizador pra quem, na verdade, não tem de onde tirar dinheiro.
function reservaEmergencia(investimentos) {
  // Dois caminhos, de propósito: o tipo "reserva de emergência" é o atalho pra quem só quer dizer
  // quanto tem guardado, sem modelar cotas; a marcação continua pra quem quer apontar um ativo
  // real (um CDB de liquidez diária) como sendo a reserva.
  const marcados = (investimentos || []).filter((i) => i && (i.reserva || i.tipo === 'reserva_emergencia'));
  const total = marcados.reduce((soma, i) => soma + resumoInvestimento(i).valorAtual, 0);
  return { total, temMarcado: marcados.length > 0 };
}

// Média de despesa dos últimos meses, contando só os meses que tiveram algum movimento: quem usa
// o app há duas semanas não deve ver a própria média dividida por três e achar que gasta pouco.
function despesaMediaMensal(lancamentos, ano, mes, quantidade = 3) {
  const alvo = indiceMes(ano, mes);
  let soma = 0;
  let mesesComDado = 0;
  for (let i = 0; i < quantidade; i += 1) {
    const { ano: anoAlvo, mes: mesAlvo } = mesPorIndice(alvo - i);
    const { receitas, despesas } = resumoMensal(lancamentos || [], anoAlvo, mesAlvo);
    if (receitas === 0 && despesas === 0) continue;
    soma += despesas;
    mesesComDado += 1;
  }
  return mesesComDado ? soma / mesesComDado : 0;
}

// Formatação própria porque logic.js não pode depender de render.js (é render que requer logic —
// o contrário fecharia um ciclo). Usa Intl, e não toFixed, senão o alerta sairia com "R$ 2000,00"
// enquanto o resto da tela mostra "R$ 2.000,00". Os textos ficam em português junto com as demais
// telas que ainda não entraram na tradução; os números crus vão no próprio alerta, então uma fase
// futura de i18n consegue remontar as frases sem tocar em nenhuma regra.
function formatBR(valor, casas = 2) {
  return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas }).format(valor);
}

// Como a meta se chama na tela: o apelido quando existe, senão "Categoria › Subcategoria" pra
// meta de subcategoria, senão só a categoria.
function rotuloMeta(meta) {
  if (meta.nome) return `${meta.categoria} (${meta.nome})`;
  const sub = String(meta.subcategoria || '').trim();
  return sub ? `${meta.categoria} › ${sub}` : meta.categoria;
}

function alertasFinanceiros(state, ano, mes) {
  const lancamentos = (state && state.lancamentos) || [];
  const alertas = [];

  for (const meta of (state && state.metas) || []) {
    const { percentual, excedeu, excedente } = statusMeta(gastoDaMeta(lancamentos, meta, ano, mes), meta.limite);
    // O id é o da meta, não a categoria: com meta de subcategoria dá pra ter duas na mesma
    // categoria (o teto de Alimentação e o do iFood), e por categoria elas colidiriam.
    const nome = rotuloMeta(meta);
    if (excedeu) {
      alertas.push({
        id: `meta:${meta.id}`,
        nivel: 'critico',
        titulo: `${nome} passou da meta`,
        detalhe: `R$ ${formatBR(excedente)} acima do limite de R$ ${formatBR(meta.limite)} deste mês.`,
        valores: { percentual, excedente, limite: meta.limite },
      });
    } else if (percentual >= PERCENTUAL_META_ATENCAO) {
      alertas.push({
        id: `meta:${meta.id}`,
        nivel: 'atencao',
        titulo: `${nome} perto da meta`,
        detalhe: `Já usou ${formatBR(percentual, 0)}% do limite de R$ ${formatBR(meta.limite)} deste mês.`,
        valores: { percentual, excedente, limite: meta.limite },
      });
    }
  }

  const { receitas } = resumoMensal(lancamentos, ano, mes);
  const { parcelaTotal, percentualDaRenda } = comprometimentoMensal((state && state.dividas) || [], receitas);
  if (receitas > 0 && percentualDaRenda >= LIMITE_COMPROMETIMENTO_ATENCAO) {
    alertas.push({
      id: 'comprometimento',
      nivel: percentualDaRenda >= LIMITE_COMPROMETIMENTO_CRITICO ? 'critico' : 'atencao',
      titulo: `${formatBR(percentualDaRenda, 0)}% da renda vai em parcela de dívida`,
      detalhe: `São R$ ${formatBR(parcelaTotal)} por mês. O teto usualmente recomendado é ${LIMITE_COMPROMETIMENTO_ATENCAO}% da renda.`,
      valores: { percentualDaRenda, parcelaTotal },
    });
  }

  const { total: reserva, temMarcado } = reservaEmergencia((state && state.investimentos) || []);
  const despesaMedia = despesaMediaMensal(lancamentos, ano, mes);
  if (temMarcado && despesaMedia > 0) {
    const meses = reserva / despesaMedia;
    if (meses < MESES_RESERVA_RECOMENDADO) {
      alertas.push({
        id: 'reserva',
        nivel: meses < MESES_RESERVA_CRITICO ? 'critico' : 'atencao',
        titulo: `Sua reserva cobre ${formatBR(meses, 1)} ${meses === 1 ? 'mês' : 'meses'} de despesa`,
        detalhe: `R$ ${formatBR(reserva)} para uma despesa média de R$ ${formatBR(despesaMedia)} por mês. O recomendado costuma ser de ${MESES_RESERVA_RECOMENDADO} a 6 meses.`,
        valores: { meses, reserva, despesaMedia },
      });
    }
  }

  // Crítico antes de atenção: numa lista curta no topo da tela, o que já estourou tem que ser a
  // primeira coisa lida. Dentro do mesmo nível vale a ordem em que a regra rodou.
  const peso = (a) => (a.nivel === 'critico' ? 0 : 1);
  return alertas.sort((a, b) => peso(a) - peso(b));
}

// --- Calendário financeiro ---

// Um registro por dia COM movimento (dia parado não vira chave), no formato que a grade do
// calendário consome: entrada, saída e o saldo do dia. Transferência de propósito não entra —
// mover dinheiro entre contas próprias não é ganho nem perda, e pintaria o dia de vermelho à toa.
function resumoDiario(lancamentos, ano, mes) {
  const dias = {};
  for (const l of lancamentos || []) {
    if (l.tipo !== 'receita' && l.tipo !== 'despesa') continue;
    const { noMes, numeroParcela } = parcelaNoMes(l, ano, mes);
    if (!noMes) continue;
    // A parcela é cobrada no mesmo DIA do mês da compra, então o dia vem da data original mas o
    // mês/ano vêm do mês exibido — senão a parcela 3 apareceria no mês da compra.
    const diaDoMes = Number(l.data.split('-')[2]);
    const chave = `${ano}-${String(mes).padStart(2, '0')}-${String(diaDoMes).padStart(2, '0')}`;
    if (!dias[chave]) dias[chave] = { data: chave, entrada: 0, saida: 0, saldo: 0, quantidade: 0 };
    const valor = parcelaValor(l);
    if (l.tipo === 'receita') dias[chave].entrada += valor;
    else dias[chave].saida += valor;
    dias[chave].saldo = dias[chave].entrada - dias[chave].saida;
    dias[chave].quantidade += 1;
    void numeroParcela;
  }
  return dias;
}

// O que aconteceu numa data específica — usado ao tocar num dia do calendário. Diferente de
// resumoDiario, aqui a transferência aparece: ela não conta como ganho/perda, mas é movimento
// que a pessoa fez naquele dia e faz falta no extrato do dia.
function lancamentosDoDia(lancamentos, data) {
  const [ano, mes, dia] = String(data).split('-').map(Number);
  const resultado = [];
  for (const l of lancamentos || []) {
    const { noMes, numeroParcela } = parcelaNoMes(l, ano, mes);
    if (!noMes) continue;
    if (Number(l.data.split('-')[2]) !== dia) continue;
    resultado.push({
      id: l.id,
      tipo: l.tipo,
      categoria: l.categoria,
      descricao: l.descricao || l.categoria,
      valor: parcelaValor(l),
      numeroParcela,
      parcelas: l.parcelas || 1,
    });
  }
  return resultado;
}

// --- Entrada por linguagem natural ---

// Palavra-chave → categoria. É de propósito uma tabela burra, sem IA: roda offline, é instantânea
// e o usuário confirma tudo numa tela antes de salvar, então errar aqui custa um toque, não um
// lançamento errado. Interpretar frase solta de verdade ("almoço com o pessoal, dividido em 2")
// depende de um modelo e, portanto, da migração pra app hospedado.
const PALAVRAS_CATEGORIA = [
  ['Alimentação', ['mercado', 'supermercado', 'feira', 'padaria', 'almoco', 'almoço', 'janta', 'jantar', 'lanche', 'ifood', 'restaurante', 'cafe', 'café', 'pizza', 'acougue', 'açougue', 'hortifruti']],
  ['Transporte', ['uber', '99', 'taxi', 'táxi', 'onibus', 'ônibus', 'metro', 'metrô', 'gasolina', 'combustivel', 'combustível', 'etanol', 'estacionamento', 'pedagio', 'pedágio', 'passagem', 'ipva', 'oficina']],
  ['Moradia', ['aluguel', 'condominio', 'condomínio', 'luz', 'energia', 'agua', 'água', 'gas', 'gás', 'internet', 'iptu', 'faxina', 'reforma', 'movel', 'móvel']],
  ['Saúde', ['farmacia', 'farmácia', 'remedio', 'remédio', 'medico', 'médico', 'dentista', 'consulta', 'exame', 'plano de saude', 'academia', 'terapia', 'psicologo', 'psicólogo']],
  ['Educação', ['curso', 'faculdade', 'mensalidade', 'livro', 'material escolar', 'escola', 'apostila']],
  ['Lazer', ['cinema', 'show', 'bar', 'cerveja', 'viagem', 'hotel', 'jogo', 'passeio', 'balada', 'teatro']],
  ['Assinaturas', ['netflix', 'spotify', 'disney', 'prime', 'hbo', 'max', 'youtube', 'assinatura', 'plano', 'icloud', 'chatgpt']],
  ['Vestuário', ['roupa', 'camisa', 'calca', 'calça', 'tenis', 'tênis', 'sapato', 'vestido', 'jaqueta']],
];

const PALAVRAS_RECEITA = [
  ['Salário', ['salario', 'salário', 'pagamento', 'holerite', 'decimo', 'décimo']],
  ['Freelance', ['freela', 'freelance', 'bico', 'servico extra', 'serviço extra']],
  ['Investimentos', ['dividendo', 'jcp', 'rendimento', 'juros', 'provento']],
  ['Outras Receitas', ['presente', 'reembolso', 'restituicao', 'restituição', 'venda']],
];

// Compara sem acento e sem maiúscula, pra "SALARIO", "Salário" e "salario" caírem no mesmo lugar.
function normalizarTexto(texto) {
  return String(texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

// Aceita "1.450,00" (brasileiro), "7.50" (teclado de celular) e "32" (inteiro). Reaproveita a
// mesma regra de "separador mais à direita manda" já usada em numeroDecimalFlexivel.
// O grupo de milhar usa "+", não "*": com "*" a primeira alternativa casava parcialmente um número
// sem separador ("4500" virava "450", perdendo o último dígito). Com "+", quem não tem separador
// cai na segunda alternativa e é capturado inteiro.
const REGEX_VALOR = /(?:r\$\s*)?(\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?)/i;

function interpretarLancamento(texto) {
  const original = String(texto || '').trim();
  const semParcelas = original.replace(/\bem\s+\d+\s*x\b|\b\d+\s*x\b/gi, ' ');

  const casouParcelas = original.match(/(\d+)\s*x\b/i);
  const parcelas = casouParcelas ? Math.max(1, Number(casouParcelas[1])) : 1;

  const casouValor = semParcelas.match(REGEX_VALOR);
  const valorTotal = casouValor ? numeroDecimalFlexivel(casouValor[1]) : 0;
  const temValor = !!casouValor;

  // Descrição é o que sobra depois de tirar valor, "R$" e a marcação de parcela.
  const descricao = semParcelas
    .replace(REGEX_VALOR, ' ')
    .replace(/r\$/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const normalizada = normalizarTexto(descricao);
  const contem = (palavra) => new RegExp(`(^|\\s)${palavra.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(normalizada);

  for (const [categoria, palavras] of PALAVRAS_RECEITA) {
    if (palavras.some((p) => contem(normalizarTexto(p)))) {
      return { tipo: 'receita', categoria, descricao, valorTotal, parcelas, temValor, reconheceuCategoria: true };
    }
  }
  for (const [categoria, palavras] of PALAVRAS_CATEGORIA) {
    if (palavras.some((p) => contem(normalizarTexto(p)))) {
      return { tipo: 'despesa', categoria, descricao, valorTotal, parcelas, temValor, reconheceuCategoria: true };
    }
  }
  return { tipo: 'despesa', categoria: 'Outras Despesas', descricao, valorTotal, parcelas, temValor, reconheceuCategoria: false };
}

// --- Perfil de investidor ---

// Questionário de suitability no formato padrão do mercado: mede tolerância a perda, prazo,
// experiência e colchão de emergência. As opções vêm sempre da mais conservadora (0) pra mais
// arrojada (3), então a soma bruta já é a pontuação — não precisa de tabela de conversão.
const PERGUNTAS_PERFIL = [
  {
    id: 'reacaoQueda',
    pergunta: 'Se sua carteira caísse 20% em um mês, o que você faria?',
    opcoes: [
      { pontos: 0, texto: 'Venderia tudo pra não perder mais' },
      { pontos: 1, texto: 'Venderia uma parte' },
      { pontos: 2, texto: 'Não faria nada e esperaria' },
      { pontos: 3, texto: 'Aproveitaria pra comprar mais' },
    ],
  },
  {
    id: 'prazo',
    pergunta: 'Em quanto tempo você pretende usar esse dinheiro?',
    opcoes: [
      { pontos: 0, texto: 'Menos de 1 ano' },
      { pontos: 1, texto: 'De 1 a 3 anos' },
      { pontos: 2, texto: 'De 3 a 10 anos' },
      { pontos: 3, texto: 'Mais de 10 anos' },
    ],
  },
  {
    id: 'experiencia',
    pergunta: 'Qual sua experiência com investimentos?',
    opcoes: [
      { pontos: 0, texto: 'Nunca investi' },
      { pontos: 1, texto: 'Só poupança ou renda fixa' },
      { pontos: 2, texto: 'Já invisto em ações ou fundos imobiliários' },
      { pontos: 3, texto: 'Invisto há anos, inclusive fora do Brasil' },
    ],
  },
  {
    id: 'reserva',
    pergunta: 'Você tem reserva de emergência?',
    opcoes: [
      { pontos: 0, texto: 'Não tenho' },
      { pontos: 1, texto: 'Tenho, mas dá pra menos de 3 meses' },
      { pontos: 2, texto: 'Tenho de 3 a 6 meses de despesa guardados' },
      { pontos: 3, texto: 'Tenho mais de 6 meses guardados' },
    ],
  },
  {
    id: 'objetivo',
    pergunta: 'Qual é o principal objetivo desse dinheiro?',
    opcoes: [
      { pontos: 0, texto: 'Preservar o que já tenho, sem correr risco' },
      { pontos: 1, texto: 'Render um pouco acima da poupança' },
      { pontos: 2, texto: 'Crescer no médio prazo, aceitando oscilação' },
      { pontos: 3, texto: 'Multiplicar o patrimônio no longo prazo' },
    ],
  },
  {
    id: 'sobraDaRenda',
    pergunta: 'Quanto da sua renda mensal sobra pra investir?',
    opcoes: [
      { pontos: 0, texto: 'Hoje não sobra nada' },
      { pontos: 1, texto: 'Até 10%' },
      { pontos: 2, texto: 'De 10% a 30%' },
      { pontos: 3, texto: 'Mais de 30%' },
    ],
  },
  {
    id: 'estabilidadeRenda',
    pergunta: 'Como é a sua renda?',
    opcoes: [
      { pontos: 0, texto: 'Instável, varia muito de um mês pro outro' },
      { pontos: 1, texto: 'Varia um pouco' },
      { pontos: 2, texto: 'Estável na maior parte do tempo' },
      { pontos: 3, texto: 'Estável e com mais de uma fonte' },
    ],
  },
  {
    id: 'dividas',
    pergunta: 'Você tem dívidas hoje?',
    opcoes: [
      { pontos: 0, texto: 'Sim, inclusive cartão ou cheque especial' },
      { pontos: 1, texto: 'Sim, financiamento ou empréstimo em dia' },
      { pontos: 2, texto: 'Só dívidas pequenas e planejadas' },
      { pontos: 3, texto: 'Não tenho dívida nenhuma' },
    ],
  },
  {
    id: 'acompanhamento',
    pergunta: 'Com que frequência você olharia a carteira?',
    opcoes: [
      { pontos: 0, texto: 'Todo dia, e ficaria aflito com a variação' },
      { pontos: 1, texto: 'Toda semana' },
      { pontos: 2, texto: 'Uma vez por mês' },
      { pontos: 3, texto: 'Poucas vezes por ano — invisto e deixo quieto' },
    ],
  },
  {
    id: 'conhecimento',
    pergunta: 'Quais produtos você entende bem o suficiente pra explicar?',
    opcoes: [
      { pontos: 0, texto: 'Só a poupança' },
      { pontos: 1, texto: 'Poupança, CDB e Tesouro Direto' },
      { pontos: 2, texto: 'Os anteriores, mais fundos e fundos imobiliários' },
      { pontos: 3, texto: 'Os anteriores, mais ações e ETFs' },
    ],
  },
  {
    id: 'perdaAceitavel',
    pergunta: 'Qual perda você aceitaria num ano ruim?',
    opcoes: [
      { pontos: 0, texto: 'Nenhuma — não quero ver o valor cair' },
      { pontos: 1, texto: 'Até 5%' },
      { pontos: 2, texto: 'Até 20%' },
      { pontos: 3, texto: 'Mais de 20%, se o plano for de longo prazo' },
    ],
  },
  {
    id: 'imprevisto',
    pergunta: 'Se aparecesse um gasto grande e inesperado, de onde sairia o dinheiro?',
    opcoes: [
      { pontos: 0, texto: 'Teria que resgatar os investimentos' },
      { pontos: 1, texto: 'Parte da reserva, parte dos investimentos' },
      { pontos: 2, texto: 'Da reserva de emergência' },
      { pontos: 3, texto: 'Da reserva, sem precisar mexer em nada investido' },
    ],
  },
  {
    id: 'aporteRegular',
    pergunta: 'Você consegue investir todo mês, mesmo que pouco?',
    opcoes: [
      { pontos: 0, texto: 'Não, só quando sobra' },
      { pontos: 1, texto: 'Quase sempre, mas o valor varia bastante' },
      { pontos: 2, texto: 'Sim, um valor parecido todo mês' },
      { pontos: 3, texto: 'Sim, e já é automático' },
    ],
  },
  {
    id: 'liquidez',
    pergunta: 'Você aceitaria deixar parte do dinheiro preso por alguns anos em troca de render mais?',
    opcoes: [
      { pontos: 0, texto: 'Não, preciso poder resgatar a qualquer momento' },
      { pontos: 1, texto: 'Uma parte pequena' },
      { pontos: 2, texto: 'Boa parte, se o prazo for claro' },
      { pontos: 3, texto: 'Sim, a maior parte' },
    ],
  },
];

// A pontuação máxima sai da própria lista, não de um número escrito à mão: as faixas são um terço
// e dois terços do total, então acrescentar ou tirar pergunta reclassifica sozinho. Antes eram 4
// perguntas com corte fixo em 4 e 8, e qualquer pergunta nova quebraria a classificação em
// silêncio — todo mundo viraria conservador.
const PONTOS_MAXIMOS_PERFIL = PERGUNTAS_PERFIL.reduce(
  (total, p) => total + Math.max(...p.opcoes.map((o) => o.pontos)),
  0
);

// Soma as respostas e corta em três faixas. Resposta faltando conta zero, então um questionário
// incompleto cai pro lado conservador em vez de quebrar.
function perguntasPerfil() {
  return PERGUNTAS_PERFIL;
}

function pontosMaximosPerfil() {
  return PONTOS_MAXIMOS_PERFIL;
}

function perfilDeInvestidor(respostas = {}) {
  let pontos = 0;
  for (const p of PERGUNTAS_PERFIL) pontos += Number(respostas[p.id]) || 0;
  const perfil =
    pontos <= PONTOS_MAXIMOS_PERFIL / 3
      ? 'conservador'
      : pontos <= (PONTOS_MAXIMOS_PERFIL * 2) / 3
        ? 'moderado'
        : 'arrojado';
  return { pontos, perfil, pontosMaximos: PONTOS_MAXIMOS_PERFIL };
}

// IMPORTANTE — isto é deliberadamente uma sugestão de proporção por CLASSE de ativo, nunca de
// ativo específico: recomendar um papel a uma pessoa é atividade regulada pela CVM (consultoria
// de valores mobiliários) e exige credenciamento, coisa que um aviso de isenção não substitui.
// Distribuir percentual entre classes é conteúdo educativo, e alimenta a meta de alocação que o
// app já tinha. Cada perfil soma exatamente 100 (coberto por teste).
// Fonte única dos tipos que participam da meta de alocação — o formulário manual (shell.html /
// app.js) e a sugestão por perfil leem daqui. Se as duas listas divergissem, o usuário perderia
// em silêncio os tipos definidos pelo perfil ao salvar o formulário manual.
const TIPOS_ALOCACAO = ['acao', 'fii', 'etf_internacional', 'tesouro_direto', 'renda_fixa', 'criptomoeda', 'outro'];

const ALOCACAO_POR_PERFIL = {
  conservador: { tesouro_direto: 45, renda_fixa: 35, fii: 15, acao: 5 },
  moderado: { tesouro_direto: 20, renda_fixa: 20, fii: 25, acao: 30, etf_internacional: 5 },
  arrojado: { renda_fixa: 10, fii: 20, acao: 40, etf_internacional: 20, criptomoeda: 10 },
};

function tiposAlocacao() {
  return TIPOS_ALOCACAO;
}

function alocacaoSugeridaPorPerfil(perfil) {
  const alocacao = ALOCACAO_POR_PERFIL[perfil];
  return alocacao ? { ...alocacao } : null;
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

// --- Monograma do ativo (ícone) ---
// O app não pode carregar logo de marca de fora (CSP do Artifact) nem reproduzir a arte de uma
// empresa sem licença — em vez disso, cada ativo ganha um "monograma": duas letras + uma cor
// derivada do próprio nome, sempre a mesma pra um dado ativo. A escolha da paleta de cores em si
// é responsabilidade de render.js (é uma questão de apresentação); aqui só fica o cálculo puro
// das iniciais e do índice na paleta.

function iniciaisAtivo(nome) {
  const texto = (nome || '').trim();
  if (!texto) return '?';
  const palavras = texto.split(/\s+/);
  if (palavras.length > 1) {
    return (palavras[0][0] + palavras[1][0]).toUpperCase();
  }
  return texto.slice(0, 2).toUpperCase();
}

// Reaproveita hashSimples (já usado pro PIN) só como gerador determinístico de índice — não tem
// nenhuma relação com segurança aqui, é só "sempre o mesmo ativo cai na mesma cor".
function corIndiceAtivo(nome, quantidadeCores) {
  if (!quantidadeCores) return 0;
  return parseInt(hashSimples(nome || ''), 36) % quantidadeCores;
}

// Parser de taxa/percentual pros campos de texto da calculadora que NÃO são .nv-campo-moeda —
// esses aceitam tanto vírgula (padrão brasileiro) quanto ponto (o que o teclado numérico de
// celular normalmente digita) como separador decimal, sem exigir formatação. Bug real que isso
// corrige: antes, "1.5" virava silenciosamente 15 (o parser de moeda trata ponto como separador de
// milhar) — aqui o separador mais à direita na string é sempre tratado como o decimal, e qualquer
// outro antes dele como agrupador de milhar, então funciona com os dois estilos.
function numeroDecimalFlexivel(texto) {
  const limpo = String(texto || '').trim();
  if (!limpo) return 0;
  const ultimaVirgula = limpo.lastIndexOf(',');
  const ultimoPonto = limpo.lastIndexOf('.');
  let normalizado;
  if (ultimaVirgula === -1 && ultimoPonto === -1) {
    normalizado = limpo;
  } else if (ultimaVirgula > ultimoPonto) {
    normalizado = limpo.replace(/\./g, '').replace(',', '.');
  } else {
    normalizado = limpo.replace(/,/g, '');
  }
  const numero = Number(normalizado);
  return Number.isFinite(numero) ? numero : 0;
}

// --- Importação de planilha CSV ---
// Tudo aqui é síncrono e sem rede: o arquivo já chega como texto (lido no navegador via FileReader,
// que é API de arquivo local e não passa pela CSP do Artifact que bloqueia fetch externo).

// Scanner de CSV no estilo RFC 4180: aspas duplas delimitam campo, "" é uma aspa literal, e dentro
// de aspas o separador e a quebra de linha são texto comum. O separador é detectado na 1ª linha —
// exportação de banco/Excel brasileiro usa ";" quase sempre, mas ',' e tab também aparecem.
function detectarSeparadorCSV(primeiraLinha) {
  const candidatos = [';', ',', '\t'];
  let escolhido = ',';
  let melhor = -1;
  for (const sep of candidatos) {
    const quantidade = primeiraLinha.split(sep).length;
    if (quantidade > melhor) {
      melhor = quantidade;
      escolhido = sep;
    }
  }
  return escolhido;
}

// O Excel em português salva "CSV" no code page do Windows (1252), não em UTF-8 — e é exatamente
// esse o caminho que a tela de importação sugere. Lido como UTF-8, o "ç" de "Almoço" vira o
// caractere de substituição e fica gravado torto pra sempre. Tenta UTF-8 estrito primeiro; se o
// arquivo não for UTF-8 válido, cai pro 1252, que aceita qualquer byte.
function decodificarCSV(bufferOuTexto) {
  if (typeof bufferOuTexto === 'string') return bufferOuTexto;
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bufferOuTexto);
  } catch (erro) {
    return new TextDecoder('windows-1252').decode(bufferOuTexto);
  }
}

function parseCSV(texto) {
  const limpo = String(texto || '').replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  const primeiraQuebra = limpo.indexOf('\n');
  const linhaCabecalho = primeiraQuebra === -1 ? limpo : limpo.slice(0, primeiraQuebra);
  const sep = detectarSeparadorCSV(linhaCabecalho);

  const linhas = [];
  // Número da linha do ARQUIVO onde cada registro começa, pra dizer "linha 7" apontando o que a
  // pessoa vê na planilha — contando cabeçalho e linhas em branco, que o parser descarta.
  const inicios = [];
  let linhaArquivo = 1;
  let inicioDoRegistro = 1;
  let campo = '';
  let linha = [];
  let dentroDeAspas = false;
  for (let i = 0; i < limpo.length; i++) {
    const c = limpo[i];
    if (c === '\n' && dentroDeAspas) linhaArquivo += 1; // quebra dentro de aspas ainda é linha do arquivo
    if (dentroDeAspas) {
      if (c === '"') {
        if (limpo[i + 1] === '"') {
          campo += '"';
          i++;
        } else {
          dentroDeAspas = false;
        }
      } else {
        campo += c;
      }
    } else if (c === '"') {
      dentroDeAspas = true;
    } else if (c === sep) {
      linha.push(campo);
      campo = '';
    } else if (c === '\n') {
      linha.push(campo);
      linhas.push(linha);
      inicios.push(inicioDoRegistro);
      linhaArquivo += 1;
      inicioDoRegistro = linhaArquivo;
      linha = [];
      campo = '';
    } else {
      campo += c;
    }
  }
  linha.push(campo);
  linhas.push(linha);
  inicios.push(inicioDoRegistro);

  const naoVazia = (l) => l.some((c) => c.trim() !== '');
  const comConteudo = [];
  const numerosComConteudo = [];
  linhas.forEach((l, i) => {
    if (!naoVazia(l)) return;
    comConteudo.push(l.map((c) => c.trim()));
    numerosComConteudo.push(inicios[i]);
  });
  if (!comConteudo.length) return { colunas: [], linhas: [], numerosDeLinha: [] };
  return { colunas: comConteudo[0], linhas: comConteudo.slice(1), numerosDeLinha: numerosComConteudo.slice(1) };
}

// A partir dos cabeçalhos, chuta qual coluna é cada campo. Compara sem acento nem caixa, primeiro por
// igualdade exata e depois por "contém" — assim "Valor" ganha de "Valor previsto" quando os dois existem.
const CHAVES_MAPEAMENTO_CSV = {
  data: ['data', 'date', 'dia', 'vencimento', 'competencia', 'dt'],
  valor: ['valor', 'value', 'amount', 'montante', 'quantia', 'preco', 'total', 'vlr'],
  descricao: ['descricao', 'description', 'historico', 'memo', 'nome', 'detalhe', 'lancamento', 'estabelecimento', 'titulo', 'referencia'],
  categoria: ['categoria', 'category', 'tipo', 'classe', 'class', 'grupo', 'rubrica'],
  subcategoria: ['subcategoria', 'subcategory', 'subgrupo', 'subtipo', 'sub'],
  parcelas: ['parcela', 'parcelas', 'installment', 'parc'],
  conta: ['conta', 'account', 'banco', 'carteira', 'cartao'],
};

// A ordem importa duas vezes: "subcategoria" vem antes de "categoria" porque a busca por "contém"
// faria a coluna Subcategoria casar também com "categoria", e uma coluna já escolhida sai da
// disputa — sem isso, uma planilha só com Subcategoria alimentava os dois campos com a mesma
// coluna, e a categoria vinha errada sem ninguém perceber.
const ORDEM_MAPEAMENTO_CSV = ['data', 'valor', 'subcategoria', 'categoria', 'parcelas', 'conta', 'descricao'];

function analisarPlanilha(texto) {
  const { colunas, linhas, numerosDeLinha } = parseCSV(texto);
  const normalizados = colunas.map((c) => normalizarTexto(c).trim());
  const usados = new Set();
  const achar = (chaves) => {
    for (let i = 0; i < normalizados.length; i++) {
      if (!usados.has(i) && chaves.some((k) => normalizados[i] === k)) return i;
    }
    for (let i = 0; i < normalizados.length; i++) {
      if (!usados.has(i) && chaves.some((k) => normalizados[i].includes(k))) return i;
    }
    return null;
  };
  const sugestao = {};
  for (const campo of ORDEM_MAPEAMENTO_CSV) {
    const indice = achar(CHAVES_MAPEAMENTO_CSV[campo]);
    if (indice !== null) usados.add(indice);
    sugestao[campo] = indice;
  }
  return { colunas, linhas, numerosDeLinha, sugestao };
}

function parseDataImportada(texto) {
  const s = String(texto || '').trim();
  if (!s) return null;
  const validar = (ano, mes, dia) => {
    if (!(mes >= 1 && mes <= 12 && dia >= 1 && dia <= 31)) return null;
    const d = new Date(ano, mes - 1, dia);
    if (d.getFullYear() !== ano || d.getMonth() !== mes - 1 || d.getDate() !== dia) return null;
    return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
  };
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/); // ISO, com ou sem hora depois
  if (m) return validar(Number(m[1]), Number(m[2]), Number(m[3]));
  m = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})/); // DD/MM/AAAA ou DD/MM/AA
  if (m) {
    let ano = Number(m[3]);
    if (ano < 100) ano += 2000;
    return validar(ano, Number(m[2]), Number(m[1]));
  }
  return null;
}

// Aceita "-89,90", "R$ 1.234,56", "(210,45)" (contábil = negativo) e "50,00-" (sinal no fim).
// Devolve número com sinal, ou null se não houver dígito ou o valor der zero.
// Converte o texto de uma célula de valor em número, entendendo separador de milhar.
// NÃO dá pra reusar numeroDecimalFlexivel aqui: a regra dele ("o separador mais à direita é o
// decimal") serve pra campo digitado à mão, onde "1.5" quer dizer 1,5. Numa planilha, "1.234" é
// mil duzentos e trinta e quatro, e lê-lo como 1,23 erraria o valor por mil vezes, em silêncio.
// Regra: separador seguido de exatamente 3 dígitos e nada depois é milhar; senão é decimal. Isso
// cobre "1.234,56", "1,234.56" e o caso sem centavos ("1.234"). O preço é que um valor de três
// casas decimais ("0,750") viraria 750 — não é o que aparece em extrato de dinheiro, onde o que
// existe é milhar.
function numeroDePlanilha(texto) {
  const s = String(texto || '').trim();
  if (!s) return NaN;
  const ultimaVirgula = s.lastIndexOf(',');
  const ultimoPonto = s.lastIndexOf('.');
  const posSeparador = Math.max(ultimaVirgula, ultimoPonto);
  if (posSeparador === -1) return Number(s);

  const depois = s.slice(posSeparador + 1);
  if (/^\d{3}$/.test(depois)) return Number(s.replace(/[.,]/g, ''));

  const inteiro = s.slice(0, posSeparador).replace(/[.,]/g, '');
  return Number(`${inteiro}.${depois}`);
}

function parseValorImportado(texto) {
  let s = String(texto || '').trim();
  if (!s) return { erro: 'Valor ausente ou inválido' };
  s = s.replace(/r\$/gi, '').replace(/[\s ]/g, '');
  let negativo = false;
  if (/^\(.*\)$/.test(s)) {
    negativo = true;
    s = s.slice(1, -1);
  }
  if (/^-/.test(s) || /-$/.test(s)) negativo = true;
  s = s.replace(/^[+-]/, '').replace(/-$/, '');
  if (!/^\d[\d.,]*$/.test(s)) return { erro: 'Valor ausente ou inválido' };
  const n = numeroDePlanilha(s);
  if (!Number.isFinite(n)) return { erro: 'Valor ausente ou inválido' };
  // Lançamento de zero não muda saldo nem gasto. Entra como recusa com o motivo certo, em vez de
  // "valor inválido", que deixaria a pessoa procurando um erro de digitação que não existe.
  if (n === 0) return { erro: 'Valor zerado' };
  return { valor: negativo ? -n : n };
}

// "12" -> 12; "3/12" (parcela atual/total) -> 12; vazio ou sem número -> 1.
// "12" (a compra é em 12x, e o valor da linha é o total) -> 12.
// "3/12" é outra coisa: a linha é a 3ª parcela já cobrada, e o valor dela é o da parcela, não o
// total. Criar um parcelamento de 12x aqui dividiria esse valor por 12 e ainda inventaria 11
// cobranças futuras que o extrato não tem — então a linha entra como lançamento único.
function parseParcelasImportada(texto) {
  const s = String(texto || '').trim();
  if (/\d+\s*\/\s*\d+/.test(s)) return 1;
  const m = s.match(/(\d+)/);
  if (m) return Math.max(1, parseInt(m[1], 10));
  return 1;
}

// Converte as linhas cruas do CSV em lançamentos no mesmo formato do resto do app. `mapa` diz o
// índice de cada campo (null quando a coluna não existe). `opcoes.contaPadraoId` é a conta única
// escolhida na tela de import; `opcoes.contas` serve pra casar o nome quando há coluna de conta.
// Linhas com data ou valor inválido não entram — voltam em `ignoradas` com o motivo, pra tela mostrar.
function converterLinhasEmLancamentos(linhas, mapa, opcoes = {}) {
  const lancamentos = [];
  const ignoradas = [];
  const contas = opcoes.contas || [];
  const contaPadraoId = opcoes.contaPadraoId || null;
  const temColuna = (idx) => idx !== null && idx !== undefined && idx >= 0;

  // Números de linha do arquivo (ver parseCSV). Sem eles, cai no índice do registro — que só
  // coincide com a planilha quando não há cabeçalho nem linha em branco.
  const numerosDeLinha = opcoes.numerosDeLinha || null;

  (linhas || []).forEach((linhaBruta, i) => {
    const linha = linhaBruta || [];
    const numeroLinha = numerosDeLinha && numerosDeLinha[i] ? numerosDeLinha[i] : i + 1;
    const cel = (idx) => (temColuna(idx) ? String(linha[idx] == null ? '' : linha[idx]).trim() : '');

    if (linha.every((c) => String(c == null ? '' : c).trim() === '')) return; // linha em branco: pula sem contar

    const data = parseDataImportada(cel(mapa.data));
    if (!data) {
      ignoradas.push({ linha: numeroLinha, motivo: 'Data ausente ou em formato não reconhecido' });
      return;
    }
    const { valor, erro } = parseValorImportado(cel(mapa.valor));
    if (erro) {
      ignoradas.push({ linha: numeroLinha, motivo: erro });
      return;
    }

    const tipo = valor < 0 ? 'despesa' : 'receita';
    const descricao = temColuna(mapa.descricao) ? cel(mapa.descricao) : '';

    let categoria = temColuna(mapa.categoria) ? cel(mapa.categoria) : '';
    if (!categoria) {
      const palpite = interpretarLancamento(descricao);
      categoria = palpite.reconheceuCategoria
        ? palpite.categoria
        : tipo === 'receita'
          ? 'Outras Receitas'
          : 'Outras Despesas';
    }

    let parcelas = temColuna(mapa.parcelas)
      ? parseParcelasImportada(cel(mapa.parcelas))
      : interpretarLancamento(descricao).parcelas;
    if (!(parcelas >= 1)) parcelas = 1;

    const lancamento = {
      id: uid(),
      data,
      tipo,
      categoria,
      subcategoria: temColuna(mapa.subcategoria) ? cel(mapa.subcategoria) : '',
      descricao,
      valorTotal: Math.abs(valor),
      parcelas,
      origem: 'importacao',
    };

    let contaId = contaPadraoId;
    if (temColuna(mapa.conta)) {
      const alvo = normalizarTexto(cel(mapa.conta)).trim();
      const achou = alvo && contas.find((c) => normalizarTexto(c.nome).trim() === alvo);
      contaId = achou ? achou.id : contaPadraoId;
    }
    if (contaId) lancamento.contaId = contaId;

    lancamentos.push(lancamento);
  });

  return { lancamentos, ignoradas };
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
    dividas: [],
    idioma: 'pt',
  };
}

function applyAction(state, action) {
  const lancamentos = state.lancamentos ? state.lancamentos.slice() : [];
  const investimentos = state.investimentos ? state.investimentos.slice() : [];
  const contas = state.contas ? state.contas.slice() : [];
  const metas = state.metas ? state.metas.slice() : [];
  const dividas = state.dividas ? state.dividas.slice() : [];
  const tema = state.tema || 'escuro';
  const ocultarValores = state.ocultarValores || false;
  const alocacaoAlvo = state.alocacaoAlvo || null;
  const idioma = state.idioma || 'pt';
  const base = { lancamentos, investimentos, contas, metas, dividas, tema, ocultarValores, alocacaoAlvo, idioma };

  switch (action.type) {
    case 'addLancamento':
      return { ...base, lancamentos: [...lancamentos, action.lancamento] };
    case 'importarLancamentos':
      return { ...base, lancamentos: [...lancamentos, ...(action.lancamentos || [])] };
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
    case 'addDivida':
      return { ...base, dividas: [...dividas, action.divida] };
    case 'editDivida':
      return { ...base, dividas: dividas.map((d) => (d.id === action.id ? { ...d, ...action.changes } : d)) };
    case 'deleteDivida':
      return { ...base, dividas: dividas.filter((d) => d.id !== action.id) };
    case 'setIdioma':
      return { ...base, idioma: action.idioma };
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
    criarSegredoPin,
    conferirPin,
    PIN_ITERACOES,
    listaSugeridaPorTipo,
    jurosCompostos,
    jurosSimples,
    percentualDeValor,
    valorEQuePercentualDoTotal,
    aplicarVariacaoPercentual,
    mesesParaAtingirMeta,
    aporteNecessarioParaMeta,
    proximosDividendosPrevistos,
    iniciaisAtivo,
    corIndiceAtivo,
    numeroDecimalFlexivel,
    PERGUNTAS_PERFIL,
    perfilDeInvestidor,
    alocacaoSugeridaPorPerfil,
    TIPOS_ALOCACAO,
    interpretarLancamento,
    totalDividas,
    patrimonioLiquido,
    comprometimentoMensal,
    resumoDiario,
    lancamentosDoDia,
    perguntasPerfil,
    pontosMaximosPerfil,
    tiposAlocacao,
    parseCSV,
    decodificarCSV,
    analisarPlanilha,
    converterLinhasEmLancamentos,
    pessoasUsadas,
    reservaEmergencia,
    despesaMediaMensal,
    alertasFinanceiros,
    subcategoriasUsadas,
    gastosPorSubcategoria,
    gastoDaMeta,
    rotuloMeta,
  };
}
