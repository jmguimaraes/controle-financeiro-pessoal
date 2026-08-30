// Tradução da interface (fase 1: Resumo, abas e Configurações — ver memória do projeto pro
// escopo combinado). Cada chave é namespaced pela tela onde é usada, pra não colidir sentidos
// diferentes que por acaso teriam o mesmo texto em português (ex.: "Carteira" a aba de
// investimentos vs. "Carteira" o tipo de conta em dinheiro — tabs.carteira e conta.tipoCarteira
// são chaves separadas de propósito, mesmo com o mesmo texto em pt).

const IDIOMA_PADRAO = 'pt';
const IDIOMAS = ['pt', 'en', 'es'];

const MESES_POR_IDIOMA = {
  pt: ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  es: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
};

// Locale do Intl usado em formatCurrency/formatNumero — mantém o valor sempre em R$ (é sempre
// real brasileiro, nunca conversão de moeda), mas adapta separador de milhar/decimal e a posição
// do símbolo à convenção de cada idioma.
const LOCALE_POR_IDIOMA = { pt: 'pt-BR', en: 'en-US', es: 'es-419' };

const TRADUCOES = {
  pt: {
    'resumo.saldoDoMes': 'SALDO DO MÊS',
    'resumo.emRelacaoA': 'em relação a',
    'resumo.receitas': 'RECEITAS',
    'resumo.despesas': 'DESPESAS',
    'resumo.carteira': 'CARTEIRA',
    'resumo.gastosPorCategoria': 'GASTOS POR CATEGORIA',
    'resumo.verTudo': 'VER TUDO',
    'resumo.parcelasEmAberto': 'PARCELAS EM ABERTO',
    'resumo.semDespesas': 'Nenhuma despesa neste mês ainda.',
    'resumo.semParcelas': 'Nenhuma parcela em aberto neste mês.',
    'tabs.resumo': 'Resumo',
    'tabs.lancamentos': 'Lançamentos',
    'tabs.carteira': 'Carteira',
    'tabs.metas': 'Metas',
    'tabs.calendario': 'Calendário',
    'header.mesAnterior': 'Mês anterior',
    'header.mesSeguinte': 'Próximo mês',
    'header.calculadoras': 'Calculadoras',
    'header.configuracoes': 'Configurações',
    'config.titulo': 'Configurações',
    'config.minhaConta': 'Minha conta',
    'config.dadosSincronizados': 'dados sincronizados neste Artifact',
    'config.aparencia': 'APARÊNCIA',
    'config.claro': 'CLARO',
    'config.escuro': 'ESCURO',
    'config.sistema': 'SISTEMA',
    'config.idioma': 'IDIOMA',
    'config.contasCartoes': 'CONTAS E CARTÕES',
    'config.adicionarConta': 'ADICIONAR CONTA',
    'config.dados': 'DADOS',
    'config.sincronizacao': 'Sincronização',
    'config.sincronizacaoAtiva': 'Ativa',
    'config.sincronizacaoIndisponivel': 'Indisponível neste dispositivo',
    'config.ocultarValores': 'Ocultar valores',
    'config.importarPlanilha': 'Importar planilha (CSV)',
    'config.importar': 'IMPORTAR',
    'config.seguranca': 'SEGURANÇA',
    'config.pinAcesso': 'PIN de acesso',
    'config.pinExplicacao': 'Evita que alguém abra o app sem querer. Não criptografa os dados: quem tiver acesso ao aparelho ainda consegue lê-los.',
    'config.ativado': 'Ativado',
    'config.desativado': 'Desativado',
    'config.definir': 'DEFINIR',
    'config.alterar': 'ALTERAR',
    'config.remover': 'REMOVER',
    'config.fechaDia': 'fecha dia',
    'conta.tipoCartao': 'Cartão',
    'conta.tipoContaCorrente': 'Conta corrente',
    'conta.tipoCarteira': 'Carteira',
  },
  en: {
    'resumo.saldoDoMes': 'MONTH BALANCE',
    'resumo.emRelacaoA': 'vs.',
    'resumo.receitas': 'INCOME',
    'resumo.despesas': 'EXPENSES',
    'resumo.carteira': 'PORTFOLIO',
    'resumo.gastosPorCategoria': 'EXPENSES BY CATEGORY',
    'resumo.verTudo': 'SEE ALL',
    'resumo.parcelasEmAberto': 'OPEN INSTALLMENTS',
    'resumo.semDespesas': 'No expenses this month yet.',
    'resumo.semParcelas': 'No open installments this month.',
    'tabs.resumo': 'Summary',
    'tabs.lancamentos': 'Entries',
    'tabs.carteira': 'Portfolio',
    'tabs.metas': 'Goals',
    'tabs.calendario': 'Calendar',
    'header.mesAnterior': 'Previous month',
    'header.mesSeguinte': 'Next month',
    'header.calculadoras': 'Calculators',
    'header.configuracoes': 'Settings',
    'config.titulo': 'Settings',
    'config.minhaConta': 'My account',
    'config.dadosSincronizados': 'data synced in this Artifact',
    'config.aparencia': 'APPEARANCE',
    'config.claro': 'LIGHT',
    'config.escuro': 'DARK',
    'config.sistema': 'SYSTEM',
    'config.idioma': 'LANGUAGE',
    'config.contasCartoes': 'ACCOUNTS & CARDS',
    'config.adicionarConta': 'ADD ACCOUNT',
    'config.dados': 'DATA',
    'config.sincronizacao': 'Sync',
    'config.sincronizacaoAtiva': 'Active',
    'config.sincronizacaoIndisponivel': 'Unavailable on this device',
    'config.ocultarValores': 'Hide values',
    'config.importarPlanilha': 'Import spreadsheet (CSV)',
    'config.importar': 'IMPORT',
    'config.seguranca': 'SECURITY',
    'config.pinAcesso': 'Access PIN',
    'config.pinExplicacao': 'Keeps someone from opening the app by accident. It does not encrypt your data: anyone with access to the device can still read it.',
    'config.ativado': 'Enabled',
    'config.desativado': 'Disabled',
    'config.definir': 'SET',
    'config.alterar': 'CHANGE',
    'config.remover': 'REMOVE',
    'config.fechaDia': 'closes on day',
    'conta.tipoCartao': 'Card',
    'conta.tipoContaCorrente': 'Checking account',
    'conta.tipoCarteira': 'Wallet',
  },
  es: {
    'resumo.saldoDoMes': 'SALDO DEL MES',
    'resumo.emRelacaoA': 'respecto a',
    'resumo.receitas': 'INGRESOS',
    'resumo.despesas': 'GASTOS',
    'resumo.carteira': 'CARTERA',
    'resumo.gastosPorCategoria': 'GASTOS POR CATEGORÍA',
    'resumo.verTudo': 'VER TODO',
    'resumo.parcelasEmAberto': 'CUOTAS PENDIENTES',
    'resumo.semDespesas': 'Aún no hay gastos este mes.',
    'resumo.semParcelas': 'No hay cuotas pendientes este mes.',
    'tabs.resumo': 'Resumen',
    'tabs.lancamentos': 'Movimientos',
    'tabs.carteira': 'Cartera',
    'tabs.metas': 'Metas',
    'tabs.calendario': 'Calendario',
    'header.mesAnterior': 'Mes anterior',
    'header.mesSeguinte': 'Mes siguiente',
    'header.calculadoras': 'Calculadoras',
    'header.configuracoes': 'Configuración',
    'config.titulo': 'Configuración',
    'config.minhaConta': 'Mi cuenta',
    'config.dadosSincronizados': 'datos sincronizados en este Artifact',
    'config.aparencia': 'APARIENCIA',
    'config.claro': 'CLARO',
    'config.escuro': 'OSCURO',
    'config.sistema': 'SISTEMA',
    'config.idioma': 'IDIOMA',
    'config.contasCartoes': 'CUENTAS Y TARJETAS',
    'config.adicionarConta': 'AGREGAR CUENTA',
    'config.dados': 'DATOS',
    'config.sincronizacao': 'Sincronización',
    'config.sincronizacaoAtiva': 'Activa',
    'config.sincronizacaoIndisponivel': 'No disponible en este dispositivo',
    'config.ocultarValores': 'Ocultar valores',
    'config.importarPlanilha': 'Importar planilla (CSV)',
    'config.importar': 'IMPORTAR',
    'config.seguranca': 'SEGURIDAD',
    'config.pinAcesso': 'PIN de acceso',
    'config.pinExplicacao': 'Evita que alguien abra la app sin querer. No cifra los datos: quien tenga acceso al aparato todavía puede leerlos.',
    'config.ativado': 'Activado',
    'config.desativado': 'Desactivado',
    'config.definir': 'DEFINIR',
    'config.alterar': 'CAMBIAR',
    'config.remover': 'QUITAR',
    'config.fechaDia': 'cierra el día',
    'conta.tipoCartao': 'Tarjeta',
    'conta.tipoContaCorrente': 'Cuenta corriente',
    'conta.tipoCarteira': 'Billetera',
  },
};

function t(chave, idioma) {
  const dicionario = TRADUCOES[idioma] || TRADUCOES[IDIOMA_PADRAO];
  return dicionario[chave] ?? TRADUCOES[IDIOMA_PADRAO][chave] ?? chave;
}

function mesesDoIdioma(idioma) {
  return MESES_POR_IDIOMA[idioma] || MESES_POR_IDIOMA[IDIOMA_PADRAO];
}

function localeDoIdioma(idioma) {
  return LOCALE_POR_IDIOMA[idioma] || LOCALE_POR_IDIOMA[IDIOMA_PADRAO];
}

// Wrapper de função (não `const`) por uma razão específica: no bundle concatenado como script
// clássico (ver build.js), só `function` no topo do arquivo vira propriedade de `window`
// automaticamente — um `const` não vira, e ficaria undefined pro resto do app no navegador.
function listaIdiomas() {
  return IDIOMAS;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { IDIOMA_PADRAO, IDIOMAS, t, mesesDoIdioma, localeDoIdioma, listaIdiomas, TRADUCOES };
}
